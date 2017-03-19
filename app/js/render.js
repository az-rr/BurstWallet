var $ = jQuery = require('jquery');
var bootstrap = require('bootstrap');
var disk = require('diskusage');
var fs = require('fs');
var os = require('os');
const {shell, ipcRenderer, clipboard} = require('electron');

var pools = require('../data/pools.json');
var burstPathArray = [];

const remote = require('electron').remote
const store = remote.getGlobal('store')

var path = require("path");

//Wallet webview
ipcRenderer.on('loadWalletView', function(event, url) {
	$('#wallet_view').attr('src', url);
});

$('#wallet_view').height($(window).height()-36);

$( window ).resize(function() {
  $('#wallet_view').height($(window).height()-36);
});



//only need to run these once
populatePools();
getBurstStats();
populateThreads();
setCurrentPref();
setInterval(getBurstStats, (60000 * 5));




//footer
function getBurstStats()
{

	$.getJSON("https://api.coinmarketcap.com/v1/ticker/burst/", function(result){
		$('#stats_price').html('Price: ' + result[0].price_btc);
		$('#stats_vol').html('Volume (24hr): ' + result[0]['24h_volume_usd'] + '');
		$('#stats_1hr').html('Change (1hr): ' + result[0].percent_change_1h + '%');
		$('#stats_24hr').html('Change (24hr): ' + result[0].percent_change_24h + '%');
		$('#stats_1d').html('Change (7d): ' + result[0].percent_change_7d + '%');
	});

}

//hide existing modal before showing a new one.
$('.modal').on('show.bs.modal', function () {
    $('.modal').not($(this)).each(function () {
        $(this).modal('hide');
    });
});

//Modals
ipcRenderer.on('openPlotWindow', function(event, message) {
	showPlottingModal();
});

ipcRenderer.on('openMiningWindow', function(event, message) {
	showMiningModal();	
});

ipcRenderer.on('openPrefsWindow', function(event, url) {
	$('#prefsModal').modal("show");
	console.log('show prefs')
});

ipcRenderer.on('openAboutWindow', function(event, url) {
	$('#aboutModal').modal("show");
	console.log('show about')
});

ipcRenderer.on('setAccountDetails', function(event, account) {
	if(account[0] !== false) $('#burst_address').val(account[0]);
	if(account[1] !== false)
	{
		$('#burst_id').val(account[1]);
	//	$('.burst_id_div').show();
	} 
});

//prefs
function setCurrentPref()
{

	let { id, url } = store.get('onlineWallet');
	let { showNotifications, showDebug, blockPower } = store.get('prefs');

	//set the current wallet
	document.getElementById(id).checked = true;

	//other prefs
	//document.getElementById('show_notifications').checked = showNotifications;
	document.getElementById('show_debug').checked = showDebug;
	document.getElementById('show_power_block_save').checked = blockPower;

}

$('.save_pref').click(function(){

	//get selected wallet
	var selected = document.querySelector('input[name="wallet_url"]:checked');

	var oldWallet = store.get('onlineWallet').url;

	//save it
	var id = selected.id;
	var url = selected.dataset.url;

	store.set('onlineWallet', { id, url });

	var showDebug = document.getElementById('show_debug').checked;
	var blockPower = document.getElementById('show_power_block_save').checked;

	store.set('prefs', { showDebug, blockPower });

	if(oldWallet != url)
	{
		$('#wallet_view').attr('src', url);
		let myNotification = new Notification('Burst Wallet', {
		body: 'Changing Wallet'
	}) 
	}

    $('#prefsModal').modal("hide");

});


//Mining

function showMiningModal()
{
	//find all drives that have burst
	getDrives(mineDriveCallback);

	let {burstAddress, burstId} = store.get('prefs');
	
	$('#burst_id_mine').val(burstId);
	$('#burst_address_mine').val(burstAddress);
	

	$('#mineModal').modal("show");

}

//this generates the found drives and the found plots for both mining and plotting
function getDrives(success_cb){

    var stdout = '';
    var spawn = require('child_process').spawn, list = spawn('cmd');

    list.stdout.on('data', function (data) {
        stdout += data;
    });

    list.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    list.on('exit', function (code) {
        if (code == 0) {
            var data = stdout.split('\r\n');
            data = data.splice(4,data.length - 7);
            data = data.map(Function.prototype.call, String.prototype.trim);
            success_cb(data);
        } else {
            console.log('child process exited with code ' + code);
        }
    });
    list.stdin.write('wmic logicaldisk get caption\n');
    list.stdin.end();
}

function mineDriveCallback(data)
{

	burstPathArray = [];
	
	for (var i = 0; i < data.length; i ++) 
	{

		var burstPath = path.join(data[i], 'burst', 'plots');
		if(findBurstExists(burstPath))
		{
			console.log(burstPath);
			burstPathArray.push(burstPath);
		}

	}

	populateBurstDrives(burstPathArray);

}

function findBurstExists(path)
{
	return (fs.existsSync(path)) ? true : false;
}

function populateBurstDrives(paths)
{

	//clear current list
	$('#plot_locations').empty();

	//didnt find any plots
	if(paths.length == 0)
	{
		$('#plot_locations').append('<li class="list-group-item">No plots found</li>');
		return;
	}

	//refresh list
	for(var i = 0; i < paths.length; i++)
	{
		var select = '<li class="list-group-item">' + paths[i] + '</li>';
		$('#plot_locations').append(select);
	}

}

function populatePools()
{

	for(var i = 0; i < pools.pool.length; i++)
	{
		var select = "<option>" + pools.pool[i].url+ "</option>";
		$('#pool_url').append(select);
	}

	setPortField(); 
}

function setPortField(){

	var selected = $('#pool_url').find("option:selected").val();

    for (var i = 0; i < pools.pool.length; i ++) 
	{
		if(pools.pool[i].url == selected)
		{
			$('#pool_port').val(pools.pool[i].port);
		}
	}
}

//update the pools port number
$('#pool_url').on('change', function(){
	setPortField();    
});

$('.start_mining_gpu').on('click', function(){

	var pool = $('#pool_url').val();

	if(validateMining())
	{
		var id = $('#burst_id_mine').val();
		createGPUMinerConf(id, pool);
	}
	
});

$('.start_mining_cpu').on('click', function(){

	var pool = $('#pool_url').val();
	var port = $('#pool_port').val();

	if(validateMining())
	{
		createCPUMinerConf(pool, port);
	}

});

function validateMining()
{

	var pass = true;
	//validate
	if($("#plot_locations li").length == 0)
	{
		console.log('No plots found');
		pass = false;
	}
	if(!$("#pool_url").val())
	{
		console.log('Please enter a pool url');
		$('#pool_url').parent().parent().addClass('has-error');
		pass = false;
	}
	if(!$("#pool_port").val())
	{
		console.log('Please enter a port number');
		$('#pool_port').parent().parent().addClass('has-error');
		pass = false;
	}
	if(!$("#burst_id_mine").val())
	{
		console.log('Please enter you burst ID');
		$('#burst_id_mine').parent().parent().addClass('has-error');
		pass = false;
	}
	var str1 = $("#burst_id_mine").val();

	if(str1.indexOf('Loading') != -1){
    	console.log('Please enter you burst ID');
		$('#burst_id_mine').parent().parent().addClass('has-error');
		pass = false;
	}

	if(str1.indexOf('Error') != -1){
    	console.log('Please enter you burst ID');
		$('#burst_id_mine').parent().parent().addClass('has-error');
		pass = false;
	}

	return pass;

}

$( "#pool_url" ).focus(function() {
	$('#pool_url').parent().parent().removeClass('has-error');
});

$( "#pool_port" ).focus(function() {
	$('#pool_port').parent().parent().removeClass('has-error');
});




function createCPUMinerConf(pool, port)
{

	//add extra slash
	for (var i = 0; i < burstPathArray.length; i++) {
		burstPathArray[i] = '"'+burstPathArray[i].replace(/\\/g, "\\\\")+'"';
		console.log(burstPathArray[i]);
	}

	var string = '{' + '\n';
	string = string + '"Mode" : "pool",' + '\n';
	string = string + '"Server" : "'+pool+'",' + '\n';
	string = string + '"Port" : '+port+',' + '\n';
	string = string + '' + '\n';
	string = string + '"UpdaterAddr" : "'+pool+'",' + '\n';
	string = string + '"UpdaterPort" : '+port+',' + '\n';
	string = string + '' + '\n';
	string = string + '"InfoAddr" : "'+pool+'",' + '\n';
	string = string + '"InfoPort" : '+port+',' + '\n';
	string = string + '' + '\n';
	string = string + '"EnableProxy" : false,' + '\n';
	string = string + '"ProxyPort" : 8126,' + '\n';
	string = string + '"Paths":' + '\n';
	string = string + '[' + '\n';
	string = string + burstPathArray + '\n';
	string = string + '],' + '\n';
	string = string + '"CacheSize" : 100000,' + '\n';
	string = string + '"ShowMsg" : false,' + '\n';
	string = string + '"ShowUpdates" : false,' + '\n';
	string = string + '"Debug" : true,' + '\n';
	string = string + '' + '\n';
	string = string + '"SendBestOnly" : true,' + '\n';
	string = string + '"TargetDeadline": 6048000,' + '\n';
	string = string + '' + '\n';
	string = string + '"UseFastRcv" : false,' + '\n';
	string = string + '"SendInterval" : 100,' + '\n';
	string = string + '"UpdateInterval" : 950,' + '\n';
	string = string + '' + '\n';
	string = string + '"UseLog" : true,' + '\n';
	string = string + '"ShowWinner" : false,' + '\n';
	string = string + '"UseBoost" : false,' + '\n';
	string = string + '' + '\n';
	string = string + '"WinSizeX" : 80,' + '\n';
	string = string + '"WinSizeY" : 60' + '\n';
	string = string + '}' + '\n';

	var minerConf = path.join(__dirname, '/../', 'applications', 'miner-burst-1.160705', 'miner.conf');

	console.log(minerConf);
	//save conf to disk
	fs.writeFile(minerConf, string, function (err) {
		if (err) return console.log(err);
		spawnCPUMiner();
	});	

}

function spawnCPUMiner()
{

	var minerExe = path.join(__dirname, '/../', 'applications', 'miner-burst-1.160705', 'miner-v1.160705_AVX.exe');
	console.log(minerExe);

	shell.openItem(minerExe);
	$('#mineModal').modal("hide");

	let myNotification = new Notification('Burst Wallet', {
		body: 'Miner Started'
	})  
}

function createGPUMinerConf(id, pool)
{

	var p = '';
	for (var i = 0; i < burstPathArray.length; i++) {
		p += burstPathArray[i].replace(/\\/g, "/") + ',';

	}

	var string = '';
	string = string + 'plotPaths=' + p + '\n';
	string = string + 'poolMining=true' + '\n';
	string = string + 'numericAccountId=' + id + '\n';
	string = string + 'poolServer=http://' + pool + '\n';
	string = string + 'walletServer=' + '\n';
	string = string + 'winnerRetriesOnAsync=' + '\n';
	string = string + 'winnerRetryIntervalInMs=' + '\n';
	string = string + 'devPool=' + '\n';
	string = string + 'devPoolCommitsPerRound=' + '\n';
	string = string + 'soloServer=http://localhost:8125' + '\n';
	string = string + 'passPhrase=xxxxxxxxxxxxxx' + '\n';
	string = string + 'targetDeadline=' + '\n';
	string = string + 'platformId=0' + '\n';
	string = string + 'deviceId=0' + '\n';
	string = string + 'restartInterval=240' + '\n';
	string = string + 'chunkPartNonces=320000' + '\n';
	string = string + 'refreshInterval=2000' + '\n';
	string = string + 'connectionTimeout=6000' + '\n';

	var minerProps = path.join(__dirname, '/../', 'applications', 'burstcoin-jminer-0.4.8-RELEASE', 'jminer.properties');
	console.log(minerProps);

	//save conf to disk
	fs.writeFile(minerProps, string, function (err) {
		if (err) return console.log(err);
		spawnGPUMiner();
	});	

}


function spawnGPUMiner()
{

	var minerApp = path.join(__dirname, '/../', 'applications', 'burstcoin-jminer-0.4.8-RELEASE', 'run.bat');
	console.log(minerApp);

	shell.openItem(minerApp);	

	let myNotification = new Notification('Burst Wallet', {
		body: 'GPU Miner Started'
	}) 

	$('#mineModal').modal("hide");

}



//Plotting
function showPlottingModal()
{
	//find all drives that have burst
	getDrives(plotDriveCallback);

	let {burstAddress, burstId} = store.get('prefs');
	
	$('#burst_id').val(burstId);
	$('#burst_address').val(burstAddress);
	

	//$('.burst_id_div').css('display', 'none');
	$('#plotModal').modal("show");

}

function populateThreads()
{

	for(var i = 1; i < (os.cpus().length+1); i++)
	{
		var select = "<option selected>" + i+ "</option>";
		$('#thread_count').append(select);
	}

}

function plotDriveCallback(data)
{

	$('#drive_locations').empty();

	for (var i = 0; i < data.length; i ++) 
	{

		//Plot
		var select = "<option>" + data[i]+ "</option>";
		$('#drive_locations').append(select);

	}

	$('#drive_locations first:option').attr('selected','selected');
	
	setDriveSpace();

}

$('#drive_locations').on('change', function(){
	setDriveSpace();
});

var totalBytes = 0;
var usedBytes = 0;
var freeBytes = 0;
var currentDrive;

function setDriveSpace()
{
	var selected = $('#drive_locations').find("option:selected").val();

	if(selected === undefined)
	{
		selected = $("#drive_locations").find("option:first").val();
	}

	currentDrive = selected;
    var driveinfo = checkDriveSpace(selected);

    if(driveinfo)
    {
    	$('.total_space').text(bytesToGB(driveinfo.total) + 'GB');
     	$('.free_space').text(bytesToGB(driveinfo.free) + 'GB');

     	totalBytes = driveinfo.total;
     	usedBytes = driveinfo.total - driveinfo.free;
     	freeBytes = driveinfo.free;
     	
    }
    else
    {
    	$('.total_space').text('0');
     	$('.free_space').text('0');
    }

    showNonceInfoForDrive();
     
}

function checkDriveSpace(path)
{
	var driveData = false;
	disk.check(path, function(err, info) {
	    if (err) {
	        console.log('Error: ' + err);
	    } else {
	        driveData =  info;
	    }
	});

	return driveData;

}

function bytesToMB(bytes)
{
	return Math.floor(bytes / 1028 / 1024);
}

function bytesToGB(bytes)
{
	return Math.floor(bytes / 1028 / 1024 / 1024);
}


$('#burst_address_mine').on('input',function(e){

//	if($("#burst_id_mine").val()) return;

	if($(this).val().length == 26)
	{
		$('#burst_id_mine').val('Loading...');
		//$('.burst_id_div').show();

		console.log("Getting ID for: " + $(this).val());
		$.getJSON('https://wallet1.burstnation.com:8125/burst?requestType=rsConvert&account=' + $(this).val())
		.done(function( json ) {

			if(json === undefined)
			{
				$('#burst_id_mine').val('Error getting Burst ID. Please try again.');
			}
			else
			{
				var burstAddress = $('#burst_address_mine').val();
				var burstId = json.account;
				store.set('prefs', { burstAddress, burstId });
				$('#burst_id_mine').val(json.account);
			}
		})
		.fail(function( jqxhr, textStatus, error ) {
			var err = textStatus + ", " + error;
			console.log( "Request Failed: " + err );
			$('#burst_id_mine').val('Error getting Burst ID. Please try again.');
		});
	}
	else
	{
		$('#burst_id_mine').html('');
	}
	
});

$('#burst_address').on('input',function(e){

//	if($("#burst_id").val()) return;

	if($(this).val().length == 26)
	{
		$('#burst_id').val('Loading...');
		//$('.burst_id_div').show();

		console.log("Getting ID for: " + $(this).val());
		$.getJSON('https://wallet1.burstnation.com:8125/burst?requestType=rsConvert&account=' + $(this).val())
		.done(function( json ) {

			if(json === undefined)
			{
				$('#burst_id').val('Error getting Burst ID. Please try again.');
			}
			else
			{
				var burstAddress = $('#burst_address').val();
				var burstId = json.account;
				store.set('prefs', { burstAddress, burstId });
				$('#burst_id').val(json.account);
			}
		})
		.fail(function( jqxhr, textStatus, error ) {
			var err = textStatus + ", " + error;
			console.log( "Request Failed: " + err );
			$('#burst_id').val('Error getting Burst ID. Please try again.');
		});
	}
	else
	{
		$('#burst_id').html('');
	}
	
});

$('#plot_size').on('change', function(){
	showNonceInfoForDrive();
});

function showNonceInfoForDrive()
{

	//get starting nonce for drive
	var startNonceForDrive = (currentDrive.toString().charCodeAt(0)-31)*100000000;

	//our wanted plot size
	var plotsize =  $('#plot_size').val();

	var used = usedBytes / 1024 / 1024 / 1024;
	var left = freeBytes / 1024 / 1024 / 1024;

	//is the plot too big?
	if(plotsize >  Math.floor(left))
	{
		console.log('plot size too big. lowering to free space');
		plotsize =  Math.floor(left);
	}

	var usedn = Math.ceil(used) * 4096;
	var startNonce = startNonceForDrive + usedn + 1;
	var noncesCount = plotsize * 4096;

	$('#start_nonce').val(startNonce);
	$('#nonces_count').val(noncesCount);

	

}

$( "#plot_size" ).focus(function() {
	$('#plot_size').parent().parent().removeClass('has-error');
});

$( "#burst_address" ).focus(function() {
	$('#burst_address').parent().parent().removeClass('has-error');
});

$( "#burst_id" ).focus(function() {
	$('#burst_id').parent().parent().removeClass('has-error');
});

$('.plot').click(function(){
	
	//validate
	var burstAddress = $('#burst_address').val();
	var burstId = $('#burst_id').val();
	var plotSize = $('#plot_size').val();
	var freeSpaceGb = $('#free_space').val();

	var error = false;
	if(plotSize > freeSpaceGb)
	{
		console.log('plot too big');
		$('#plot_size').parent().parent().addClass('has-error');
		error = true;
	}
	if(plotSize < 1)
	{
		console.log('plot size too small');
		$('#plot_size').parent().parent().addClass('has-error');
		error = true;
	}
	if(!$("#burst_address").val())
	{
		console.log('Please enter you burst address');
		$('#burst_address').parent().parent().addClass('has-error');
		error = true;
	}
	if(!$("#burst_id").val())
	{
		console.log('Please enter you burst ID');
		$('#burst_id').parent().parent().addClass('has-error');
		error = true;
	}

	if(error) return;

	//save details
	store.set('prefs', { burstAddress, burstId });

	//start plotting
	spawnCPUPlotter($('#burst_id').val(), $('#start_nonce').val(), $('#nonces_count').val(), $('#thread_count').val(),currentDrive.toString());
});

function spawnCPUPlotter(id, sn, n, t, drive)
{

	var plotterPath = path.join(__dirname, '/../', 'applications', 'XPlotter.v1.0', 'XPlotter_avx.exe');
	var command = plotterPath + ' -id '+ id + ' -sn ' + sn +' -n '+ n + ' -t ' + t + ' -path ' + drive + "\\Burst\\plots";
	console.log(plotterPath);

	var plotterApp = path.join(__dirname, '/../', 'applications', 'XPlotter.v1.0', 'start.bat');
	console.log(plotterApp);

	//save bat to disk
	fs.writeFile(plotterApp, command, function (err) {
		if (err) return console.log(err);
		shell.openItem(plotterApp);	
	});	

	let myNotification = new Notification('Burst Wallet', {
		body: 'Plotter Started'
	}) 

	$('#plotModal').modal("hide");

}


$('.selectable').click(function(){
	clipboard.writeText($('.selectable').text());
	let myNotification = new Notification('Burst Wallet', {
		body: $('.selectable').text() + ' Copied to the clipboard.'
	})   
});







