import pty
import os
import time

password = "Tomtom2026\n"
command = "ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=60 -N -L 15432:127.0.0.1:5432 root@8.138.126.34"

pid, fd = pty.fork()

if pid == 0:
    # Child process
    os.system(command)
else:
    # Parent process
    while True:
        try:
            output = os.read(fd, 1024).decode('utf-8')
            if 'password:' in output:
                os.write(fd, password.encode('utf-8'))
                print("Password sent.")
                # We do not break here because we want the script to keep running
                # and keeping the SSH session alive in the background.
                break
        except Exception as e:
            print("Exception:", e)
            break
            
    print("SSH tunnel established in background.")
    # Keep parent alive so child doesn't terminate immediately if dependent
    while True:
        time.sleep(60)
