import pty
import os
import sys
import time

password = "Tomtom2026\n"
command = "ssh -v -o StrictHostKeyChecking=no -o ServerAliveInterval=30 -o ServerAliveCountMax=5 -N -L 15432:127.0.0.1:5432 root@8.138.126.34"

while True:
    print("Starting SSH child process...")
    pid, fd = pty.fork()

    if pid == 0:
        os.system(command)
        sys.exit(0)
    else:
        print("Waiting for SSH output...")
        while True:
            try:
                output = os.read(fd, 1024).decode('utf-8', errors='ignore')
                sys.stdout.write(output)
                sys.stdout.flush()
                
                if 'password:' in output.lower():
                    os.write(fd, password.encode('utf-8'))
                    print("\n[!] Password sent.")
                    sys.stdout.flush()
                    
                if 'Entering interactive session' in output or 'Local forwarding listening on' in output:
                    print("\n[!] Tunnel established!")
                    sys.stdout.flush()
            except OSError as e:
                print(f"\n[!] SSH Process ended or I/O error: {e}")
                break
            except Exception as e:
                print(f"\n[!] Exception: {e}")
                break
                
        # Wait for the child process to finish before restarting
        try:
            os.waitpid(pid, 0)
        except ChildProcessError:
            pass
            
        print("[!] Tunnel dropped. Restarting in 5 seconds...")
        time.sleep(5)
