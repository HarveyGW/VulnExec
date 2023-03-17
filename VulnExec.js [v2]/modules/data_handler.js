// dependencies 
const fs = require('fs')

// Modules
const log = require('./log.js')
const util = require('./spinnier.js')
const msf = require('./msf_modules.js')

const fetch_vuln = () => {
    util.spinner.add('vuln_find', {text: 'Looking for Vulnerabilities', spinnerColor: 'redBright'})
    const data = fs.readFileSync('nmap.txt', 'utf8');
    const cve = data.match(/CVE-\d{4}-\d{4,7}/g)
    const ms = data.match(/ms\d{2}-\d{3}/g)

    let combo = []



    if (cve !== null) {
        let cve2 = cve.toString().split(',')
        cve2.forEach(element => {
            combo.push(element)
        });
    }

    if (ms !== null) {
        let ms2 = ms.toString().split(',')
        ms2.forEach(element => {
            combo.push(element)
        })
    }
    
    if (combo.length > 0) {
        combo = new Set(combo)
        util.spinner.succeed('vuln_find', {text: 'Found Vulnerabilities', succeedColor: 'redBright'})
        combo.forEach(element =>{
            console.log(log.chalk.redBright(element))

            //msf.search_vuln(element)
        })
    } else {
        util.spinner.fail('vuln_find', {text: 'No Found Vulnerabilities', failColor: 'redBright'})
        process.exit()
    }
}

module.exports = {
    fetch_vuln
}