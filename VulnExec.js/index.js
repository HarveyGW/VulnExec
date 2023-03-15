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
const ms = [];
var ip = '10.129.250.42'

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

// REMOVE THE COMMENT HERE
setTimeout(() => {
    log.vuln('VULN EXEC LOADED');
    nmap_scan(ip);
}, 2000);

nmap_scan = async (ip) => {
    const nmap = spawn('nmap', ['-sS', '-sV', '-T5','--script','vuln', ip]);
    nmap.stdout.on('data', (data) => {
        data = data.toString();

        if(data.includes('Starting Nmap')) {
            spinner.add('nmap', {text: 'Nmap Scan Started', color: 'red'});
        } else if(data.includes('Nmap done')) {
            spinner.succeed('nmap', {text: 'Nmap Scan Completed', color: 'red'});
            spinner.add('get_data', {text: 'Getting Vulnerabilities', color: 'red'});
            get_vuln();
        }  else {
            
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

    if(cve && ms) {
        log.vuln('CVEs Found: ' + cve);
        log.vuln('MS Found: ' + ms);
        cves.push(cve);

    }
    if(ms) {
        log.vuln('MS Found: ' + ms);
        ms.push(ms);
    }

    if(cves.length > 0 || ms.length > 0) {
        spinner.succeed('get_data', {text: 'Vulnerabilities Found', color: 'red'});

        if (cves.length > 0) {
            spinner.add('cve', {text: 'Exploiting CVEs', color: 'red'});
            exploit(ip);
        }
        
    } else {
        spinner.fail('data', {text: 'No Vulnerabilities Found', color: 'red'});
        log.info('No Vulnerabilities Found');
    }

}

//msf exploit 
const exploit = async (ip) => {
    for (let i = 0; i < cves.length; i++) {
        const exploit = spawn('msfconsole', ['-q']);
        exploit.stdin.write(`search ${cves[0]}\n`);
        exploit.stdout.on('data', (data) => {
            if (data.includes('No results')) {
                spinner.fail('cve', {text: 'No Exploit Found', color: 'red'});
                exploit.kill();
            } else {
                log.info(data);
            }
        })
        exploit.stderr.on('data', (data) => {
            data = data.toString();
            if (data.includes('stty')) {
                return
            } else {
                log.error(data);
            }
        })
    }
}
