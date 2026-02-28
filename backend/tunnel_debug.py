import pty
import os
import sys
import time

password = "Tomtom2026\n"
command = "ssh -v -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -N -L 15432:127.0.0.1:5432 root@8.138.126.34"

pid, fd = pty.fork()

if pid == 0:
    os.system(command)
else:
    print("Started SSH child process. Waiting for output...")
    while True:
        try:
            output = os.read(fd, 1024).decode('utf-8', errors='ignore')
            print("SSH OUTPUT:", output)
            sys.stdout.flush()
            if 'password:' in output.lower():
                os.write(fd, password.encode('utf-8'))
                print("Password sent.")
                sys.stdout.flush()
                # break but keep reading to prevent pipe buffer getting full
            if 'debug1: Entering interactive session' in output or 'Local forwarding listening on' in output:
                print("Tunnel established!")
                sys.stdout.flush()
        except Exception as e:
            print("Exception:", e)
            break
