import os
import sys
import time
import signal
import subprocess
import shutil
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"

def find_python_executable():
    """Detect virtual environment python executable or default to current python."""
    candidates = [
        BACKEND_DIR / "venv" / "Scripts" / "python.exe",
        ROOT_DIR / "venv" / "Scripts" / "python.exe",
        BACKEND_DIR / "venv" / "bin" / "python",
        ROOT_DIR / "venv" / "bin" / "python",
    ]
    for path in candidates:
        if path.exists():
            return str(path)
    return sys.executable

def find_npm_command():
    """Detect npm / npm.cmd for Windows or Unix."""
    if sys.platform == "win32":
        npm_path = shutil.which("npm.cmd") or shutil.which("npm")
        return npm_path or "npm.cmd"
    return "npm"

def stop_process(proc, name="Service"):
    """Gracefully terminate a process tree."""
    if proc and proc.poll() is None:
        try:
            print(f"[*] Stopping {name} (PID: {proc.pid})...")
            if sys.platform == "win32":
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(proc.pid)],
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL,
                    check=False
                )
            else:
                proc.terminate()
                proc.wait(timeout=3)
        except Exception:
            try:
                proc.kill()
            except Exception:
                pass

def main():
    print("==================================================")
    print("       VISIONAI - FULL STACK APPLICATION          ")
    print("==================================================")
    print()

    # 1. Start FastAPI Backend
    print("[1/2] Starting FastAPI Backend...")
    python_exe = find_python_executable()
    backend_script = BACKEND_DIR / "app.py"

    backend_proc = subprocess.Popen(
        [python_exe, str(backend_script)],
        cwd=str(BACKEND_DIR),
        env=os.environ.copy()
    )
    print(f"Backend: http://localhost:8000 (PID: {backend_proc.pid})")
    print()

    # Give backend a moment to bind port
    time.sleep(1.5)

    # 2. Start Next.js Frontend
    print("[2/2] Starting Next.js Frontend...")
    npm_cmd = find_npm_command()
    
    frontend_proc = subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=str(FRONTEND_DIR),
        env=os.environ.copy(),
        shell=(sys.platform == "win32")
    )
    print(f"Frontend: http://localhost:3000 (PID: {frontend_proc.pid})")
    print()

    print("==================================================")
    print("Both services are running.")
    print("Open: http://localhost:3000")
    print("API:  http://localhost:8000")
    print("Docs: http://localhost:8000/docs")
    print("==================================================")
    print()
    print("Press CTRL+C to stop all services.")
    print()

    def handle_exit(signum=None, frame=None):
        print("\n\n[*] Shutting down VISIONAI services...")
        stop_process(frontend_proc, "Next.js Frontend")
        stop_process(backend_proc, "FastAPI Backend")
        print("[*] All services stopped.")
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_exit)
    signal.signal(signal.SIGTERM, handle_exit)

    try:
        while True:
            # Monitor health of both child processes
            if backend_proc.poll() is not None:
                print(f"[!] Backend process exited with code {backend_proc.returncode}")
                break
            if frontend_proc.poll() is not None:
                print(f"[!] Frontend process exited with code {frontend_proc.returncode}")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        handle_exit()
    finally:
        handle_exit()

if __name__ == "__main__":
    main()
