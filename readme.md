# Burst Wallet

A new AIO Burst Wallet for Windows.

Features
- Completely new code base built on Chromium
- Wallet selection (both online and local)
- Plotting
- Mining (CPU & GPU)
- Faucets
- Asset Explorer
- Network Status
- Notifications

If you find any bugs or want some features added let me know. Just open an issue here.
[https://github.com/wombatt/BurstWallet/issues](https://github.com/wombatt/BurstWallet/issues)

### Download
See the releases here. 
[https://github.com/wombatt/BurstWallet/releases](https://github.com/wombatt/BurstWallet/releases)

### Screenshots
![SS1](https://raw.githubusercontent.com/wombatt/BurstWallet/master/screens/1.jpg)
![SS2](https://raw.githubusercontent.com/wombatt/BurstWallet/master/screens/2.jpg)
![SS3](https://raw.githubusercontent.com/wombatt/BurstWallet/master/screens/3.jpg)
![SS4](https://raw.githubusercontent.com/wombatt/BurstWallet/master/screens/4.jpg)

### Tech
The wallet uses a number of projects to work properly:
- Plotter: miner-burst-1.160705
- CPU Miner: XPlotter.v1.0
- GPU Minier: burstcoin-jminer-0.4.8-RELEASE

### Installation and Build

The wallet is built with Electron. Install the dependencies and devDependencies to begin. (7zip is required to zip)

```sh
$ npm install 
$ npm run pack
$ npm run rename
$ npm run zip
```

### License
MIT
