const chalk = require('chalk')
const fs = require('fs')

const logfile = 'runtime.log'
vuln = (text) => {
    console.log(chalk.redBright('[ VULN EXEC ] ') + text)
}

info = (text) => {
    console.log(chalk.blueBright('[ INFO ] ') + text)
}

error = (text) => {
    console.log(chalk.redBright('[ ERROR ] ') + text)
}

help = () => {
    message =
    `
    Usage : \n
    node index.js -i <local interface> -t <Target IP> < -q / -l >
    Startup Parameters : \n
\n
    -i = Local Interface Name / Local IP Address\n
    -t = Target (IP Address or Hostname)\n
    -q = Quiet Mode (Covert NMAP Scans)\n
    -l = Loud Mode (Aggressive NMAP Scans)\n
    -h = Display this mesage again
\n\n
    -i -t Are Required Params, Either -l or -q is required
    `

    console.log(chalk.redBright(message))
}

logo_message = () => {
    console.clear()
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

console.log(chalk.redBright(logo))
}

const runtime = (ip, mode) => {
 let date = new Date()
 
 day = date.getDate()
 month = date.getMonth()
 year = date.getFullYear()

 hour = date.getHours()
 minute = date.getMinutes()

 const string = `[${hour}:${minute} | ${day}/${month}/${year}]`
const log_string = string + ` ${ip} was scanned used ${mode} Mode`
 fs.appendFile(logfile, log_string, (err) =>{
    if (err){
        console.log(err)
    }
 })
}

module.exports = {
    vuln,
    info,
    error,
    help,
    logo_message,
    chalk,
    runtime
}