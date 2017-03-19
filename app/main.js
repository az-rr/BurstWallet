var electron = require('electron');
var BrowserWindow = electron.BrowserWindow;
var Menu = electron.Menu;
var MenuItem = electron.MenuItem;
var app = electron.app;
var ipc = electron.ipcMain;
var powerSaveBlocker = electron.powerSaveBlocker;
var path = require("path");
const Store = require('./store.js');

// var Tray = electron.Tray;
// let tray = null;
var appWindow;

// instantiate our user preferences
global.store = new Store({
  configName: 'user-preferences',
  defaults: {
    windowBounds: { width: 850, height: 600 },
    onlineWallet: { id: 0, url: 'https://wallet1.burstnation.com:8125'},
    prefs: { showDebug: false, blockPower: false, burstAddress: false, burstId: false }
  }
});


var powerId = null;

// instantiate our main menubar
var template = [{
    label: 'File',
    submenu: [{
        label: 'Edit Preferences',
        accelerator: 'CmdOrCtrl+E',
        click: openPreferencesWindow
    },
    {
        label: 'About',
        click: openAboutWindow
    },
	{
		type: 'separator'
	},
    {
        label: 'Exit',
        accelerator: 'Alt+F4',
        click: () => {
			app.quit();
		}
    }
    ]
},
{
    label: 'Burst',
    submenu: [{
        label: 'Plot',
        accelerator: 'CmdOrCtrl+P',
        click: openPlotWindow
    },
    {
        label: 'Mine',
        accelerator: 'CmdOrCtrl+M',
      	click: openMiningWindow
    },
    {
		type: 'separator'
	},
    {
        label: 'Change Reward Assignment',
        accelerator: 'CmdOrCtrl+K',
        click: changeReward
    }
    ]
},
{
    label: 'Faucets',
    submenu: [{
        label: 'Burstnation.com',
        click () { openExternalWindow("http://faucet.burstnation.com/") }
    },
    {
    	label: 'Burstcoin.biz',
    	click () { openExternalWindow("http://burstcoin.biz/faucet")}
    },
    {
    	label: 'Pingofburst.win',
    	click () { openExternalWindow("http://faucet.pingofburst.win/")}
    }
    ]
},
{
    label: 'Tools',
    submenu: [{
        label: 'Network Status',
        accelerator: 'CmdOrCtrl+N',
    	click () { openExternalWindow("http://network.burstnation.com:8888/") }
    },
    {
        label: 'Asset Explorer',
        accelerator: 'CmdOrCtrl+A',
      	click () { openExternalWindow("http://asset.burstnation.com/") }
    }
    ]
}]

const selectionMenu = Menu.buildFromTemplate([
    {role: 'copy'},
    {role: 'paste'},
    {type: 'separator'},
    {role: 'selectall'},
  ])


  

//load our prefs
let { showDebug, blockPower, burstAddress, burstId } = store.get('prefs');
let { width, height } = store.get('windowBounds');
let { id, url } = store.get('onlineWallet');


app.on('ready', function(){

	//power settings
	setPowerBlock(blockPower);

	//build the menu
	var menu = Menu.buildFromTemplate(template);

	if(showDebug){
		menu.append(new MenuItem({ label: 'Debug', submenu: [
		    {
		        label: 'Reload',
		        accelerator: 'CmdOrCtrl+R',
		        click(item, focusedWindow) {
		            if (focusedWindow) {
		                focusedWindow.reload();
		            }
		        }
		    },
		    {
		        label: 'Toggle Developer Tools',
		        accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
		        click(item, focusedWindow) {
		            if (focusedWindow) {
		                focusedWindow.webContents.toggleDevTools();
		            }
		        }
		    }
		]}));
	}

	Menu.setApplicationMenu(menu);

	//load our index
	appWindow = new BrowserWindow({
		width, 
		height,
		minWidth: 850
	});
	appWindow.loadURL('file://' + __dirname + '/index.html');

	appWindow.webContents.on("did-fail-load", function() {
    	console.log("failed to load the main webview")
    });

    appWindow.webContents.on("did-finish-load", function() {
    	appWindow.webContents.send('loadWalletView', url + '/index.html');
    	appWindow.webContents.send('setAccountDetails', [burstAddress, burstId]);

    });

  //   appWindow.on('minimize',function(event){
		// event.preventDefault()
		// appWindow.hide();
  //   });

	//save window dimentions
	appWindow.on('resize', () => {
		let { width, height } = appWindow.getBounds()
		store.set('windowBounds', { width, height })
	})

	appWindow.webContents.on('context-menu', (e, props) => {
		selectionMenu.popup(appWindow);
	})

	// var iconPlain = path.join(__dirname, '/../icons/icon.ico');
	// tray = new Tray(iconPlain);
	// const contextMenu = Menu.buildFromTemplate([
	// 	{
	// 		label: 'Exit',
	//         accelerator: 'Alt+F4',
	//         click: () => {
	// 			app.quit();
	// 		}
	// 	}
	// ])
	// tray.setToolTip('Burst Wallet')
	// tray.setContextMenu(contextMenu)

	// tray.on('click', function (event) {
	// 	event.preventDefault();
	// 	appWindow.show();
	// 	return false;
 //    });
});


function setPowerBlock(block)
{

	if(block)
	{
		powerId = powerSaveBlocker.start('prevent-display-sleep');
	}

}

function openExternalWindow (url){
	let child = new BrowserWindow({modal: true})
	child.loadURL(url)
	child.setMenu(null);
}

function openPreferencesWindow (){
	appWindow.webContents.send('openPrefsWindow');
}

function openAboutWindow (){
	appWindow.webContents.send('openAboutWindow');
}

function openPlotWindow (){
	appWindow.webContents.send('openPlotWindow');
}

function openMiningWindow (){
	appWindow.webContents.send('openMiningWindow');
} 


function changeReward (){
	let child = new BrowserWindow({width: 300, height:430});
	console.log(url + '/rewardassignment.html')
	child.loadURL(url + '/rewardassignment.html');
	child.setMenu(null);
}