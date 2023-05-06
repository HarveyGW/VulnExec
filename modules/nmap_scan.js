// dependencies 
const {spawn} = require('child_process')
const fs = require('fs')

// Modules
const log = require('./log.js')
const util = require('./spinnier.js')
const data_handler = require('./data_handler.js')
const msf = require('./msf_modules')


const start = async (ip, mode) => {
    fs.writeFile('nmap.txt', '', (err) => {
        if(err) {
            log.error(err);
        }
    });

    var nmap = null
    if (mode === 'loud') {
        nmap = spawn('nmap', ['-sS', '-sV', '-T5','--script','vuln', ip]);
    } else if (mode === 'quiet') {
        nmap = spawn('nmap', ['-sS', '-sV', '-T1','--script','vuln', ip]);
    } else {
        log.error('Something broke in nmap_scan.js')
    }

    nmap.stdout.on('data', (data)=>{
        data = data.toString()

        if (data.includes('Starting Nmap')) {
            util.spinner.add('nmap', {text: `Vulnerability Scan Started in ${mode} Mode on ${ip}`, spinnerColor: 'redBright'})
        }

        if (data.includes('Nmap done')) {
            util.spinner.succeed('nmap', {text: `Vulnerability Scan Completed Successfully on ${ip}`, succeedColor: 'greenBright'})
            data_handler.fetch_vuln()
        }

        fs.appendFile('nmap.txt', data, (err) => {
            if(err) {
                log.error(err);
            }
        } )
    })
}

module.exports = { start }