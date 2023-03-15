const { exec, spawn} = require('child_process');
const chalk = require('chalk');
const axios = require('axios');
const Spinnies = require('spinnies');
const spinner = new Spinnies();
const data_spinner = new Spinnies();
const fs = require('fs');

const log = require('./modules/utils.js');
const { colorOptions } = require('spinnies/utils.js');

// global variables
const cves = [];
var ms = [];
var ip = '65.108.249.99'

const logo = `

██▒   █▓ █    ██  ██▓     ███▄    █    ▓█████ ▒██   ██▒▓█████  ▄████▄  
▓██░   █▒ ██  ▓██▒▓██▒     ██ ▀█   █    ▓█   ▀ ▒▒ █ █ ▒░▓█   ▀ ▒██▀ ▀█  
 ▓██  █▒░▓██  ▒██░▒██░    ▓██  ▀█ ██▒   ▒███   ░░  █   ░▒███   ▒▓█    ▄ 
  ▒██ █░░▓▓█  ░██░▒██░    ▓██▒  ▐▌██▒   ▒▓█  ▄  ░ █ █ ▒ ▒▓█  ▄ ▒▓▓▄ ▄██▒
   ▒▀█░  ▒▒█████▓ ░██████▒▒██░   ▓██░   ░▒████▒▒██▒ ▒██▒░▒████▒▒ ▓███▀ ░
   ░ ▐░  ░▒▓▒ ▒ ▒ ░ ▒░▓  ░░ ▒░   ▒ ▒    ░░ ▒░ ░▒▒ ░ ░▓ ░░░ ▒░ ░░ ░▒ ▒  ░
   ░ ░░  ░░▒░ ░ ░ ░ ░ ▒  ░░ ░░   ░ ▒░    ░ ░  ░░░   ░▒ ░ ░ ░  ░  ░  ▒   
     ░░   ░░░ ░ ░   ░ ░      ░   ░ ░       ░    ░    ░     ░   ░        
      ░     ░         ░  ░         ░       ░  ░ ░    ░     ░  ░░ ░      
     ░                                                         ░        
`;
console.clear();
fs.writeFile('nmap.txt', '', (err) => {
    if(err) {
        log.error(err);
    }
});
console.log(chalk.redBright(logo));

setTimeout(() => {
    log.vuln('VULN EXEC LOADED');
    nmap_scan(ip);
}, 2000);

nmap_scan = async (ip) => {
    const nmap = spawn('nmap', ['-sS', '-sV', '-T5','--script','vuln', ip]);
    nmap.stdout.on('data', (data) => {
        data = data.toString();
        if(data.includes('Starting Nmap')) {
            log.info('Nmap Scan Started');
            spinner.add('nmap', {text: 'Nmap Scan Started', color: 'red'});
        } else if(data.includes('Nmap done')) {
            spinner.remove('nmap');
            log.info('Nmap Scan Completed');
            spinner.add('get_data', {text: 'Getting Vulnerabilities', color: 'red'});
            get_vuln();
        }  else {
            log.info(data);
        }
        fs.appendFile('nmap.txt', data, (err) => {
            if(err) {
                log.error(err);
            }
        } )
    });

    nmap.stderr.on('data', (data) => {
        log.error(data);
    });
    
}

// msf exploit(multi/handler) > use exploit/multi/handler

const get_vuln = async () => {
    const data = fs.readFileSync('nmap.txt', 'utf8');
    const cve = data.match(/CVE-\d{4}-\d{4,7}/g);
    const ms = data.match(/MS\d{2}-\d{3}/g);

    if(cve) {
        log.vuln('CVEs Found: ' + cve);
        cves.push(cve);

    }
    if(ms) {
        log.vuln('MS Found: ' + ms);
        ms.push(ms);
    }

    if(cves.length > 0 || ms.length > 0) {
        spinner.remove('get_data');
        log.vuln('Vulnerabilities Found');

        if (cves.length > 0) {
            spinner.add('cve', {text: 'Exploiting CVEs', color: 'red'});
            exploit(ip);
        }

        if (ms.length > 0) {
            spinner.add('ms', {text: 'Exploiting MS', color: 'red'});
            exploit(ip);
        }
        
    } else {
        spinner.remove('data');
        log.info('No Vulnerabilities Found');
    }

}

//msf exploit 
const exploit = async (ip) => {
    //const msf_param = 'msfconsole', ['-q', '-x']
    for (let i = 0; i < cves.length; i++) {
        const cve = cves[i]

        const msf = spawn('msfconsole', ['-x', `search ${cve}`])
        msf.stdout.on('data', (data) => {
            log.info(data);
        });

        msf.stderr.on('data', (data) => {
            log.error(data);
        })
    }
}





