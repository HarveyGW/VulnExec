// dependencies 
const fs = require('fs')

// Modules
const log = require('./log.js')
const util = require('./spinnier.js')
const msf = require('./msf_modules.js')
const { type } = require('os')

const fetch_vuln = async () => {
    util.spinner.add('vuln_find', {text: 'Looking for Vulnerabilities', spinnerColor: 'redBright'})
    const data = fs.readFileSync('nmap.txt', 'utf8');
    const cve = data.match(/CVE-\d{4}-\d{4,7}/g)
    const ms = data.match(/ms\d{2}-\d{3}/g)

    let combo = []
    let exploitable = []



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
        combo.forEach(async (element )=>{
            console.log(type(element))
            console.log(log.chalk.redBright(element))
            await msf.search_vuln(element).then((result) => {
                if (result) {
                    exploitable.push(element)
                    log.vuln(element + ' is exploitable')
                } else {
                    log.vuln(element + ' is not exploitable')
                }
            })        
        })

    } else {
        util.spinner.fail('vuln_find', {text: 'No Found Vulnerabilities', failColor: 'redBright'})
        process.exit()
    }
}

module.exports = {
    fetch_vuln
}