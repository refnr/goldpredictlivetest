import subprocess
import sys
import os
import shutil
import time

def run_command(command, description, shell=True):
    print(f"\n{'='*60}")
    print(f"  {description}")
    print(f"{'='*60}\n")
    result = subprocess.run(command, shell=shell, cwd=os.path.dirname(os.path.abspath(__file__)))
    if result.returncode != 0:
        print(f"\n[ERROR] {description} failed with exit code {result.returncode}")
        return False
    return True

def check_prerequisites():
    print("\n" + "="*60)
    print("  GOLD PREDICT - Local Launcher")
    print("="*60)
    print("\nChecking prerequisites...\n")

    node = shutil.which("node")
    if not node:
        print("[ERROR] Node.js is not installed.")
        print("Download it from: https://nodejs.org (LTS version)")
        return False
    result = subprocess.run(["node", "--version"], capture_output=True, text=True)
    print(f"  Node.js: {result.stdout.strip()}")

    npm = shutil.which("npm")
    if not npm:
        print("[ERROR] npm is not installed.")
        return False
    result = subprocess.run(["npm", "--version"], capture_output=True, text=True, shell=(os.name == 'nt'))
    print(f"  npm: {result.stdout.strip()}")

    env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if not os.path.exists(env_file):
        print("\n[ERROR] .env file not found!")
        print("Create a .env file in the project folder with your configuration.")
        print("See LOCALHOST_SETUP_GUIDE.md for details.")
        return False
    print(f"  .env file: Found")

    with open(env_file, 'r') as f:
        env_content = f.read()
    required_vars = ["DATABASE_URL", "SESSION_SECRET", "STRIPE_LIVE_PUBLISHABLE_KEY", "STRIPE_LIVE_SECRET_KEY"]
    missing = []
    for var in required_vars:
        if var not in env_content:
            missing.append(var)
    if missing:
        print(f"\n[WARNING] Missing environment variables in .env: {', '.join(missing)}")
        print("The app may not work correctly without these.")

    print("\nAll prerequisites satisfied!\n")
    return True

def load_env():
    env_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

def main():
    if not check_prerequisites():
        input("\nPress Enter to exit...")
        sys.exit(1)

    load_env()

    npm_cmd = "npm.cmd" if os.name == "nt" else "npm"
    npx_cmd = "npx.cmd" if os.name == "nt" else "npx"

    node_modules = os.path.join(os.path.dirname(os.path.abspath(__file__)), "node_modules")
    if not os.path.exists(node_modules):
        if not run_command(f"{npm_cmd} install", "Installing dependencies"):
            input("\nPress Enter to exit...")
            sys.exit(1)
    else:
        print("\nDependencies already installed (node_modules exists)")

    dist_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dist")
    if not os.path.exists(dist_dir):
        if not run_command(f"{npm_cmd} run build", "Building the application"):
            input("\nPress Enter to exit...")
            sys.exit(1)
    else:
        print("\nBuild already exists (dist folder found)")
        rebuild = input("Do you want to rebuild? (y/N): ").strip().lower()
        if rebuild == 'y':
            if not run_command(f"{npm_cmd} run build", "Rebuilding the application"):
                input("\nPress Enter to exit...")
                sys.exit(1)

    print("\n" + "="*60)
    print("  Setting up database schema")
    print("="*60 + "\n")
    subprocess.run(f"{npx_cmd} drizzle-kit push", shell=True, cwd=os.path.dirname(os.path.abspath(__file__)))

    port = os.environ.get("PORT", "5000")
    print("\n" + "="*60)
    print(f"  LAUNCHING GOLD PREDICT")
    print(f"  Open your browser: http://localhost:{port}")
    print(f"  Press Ctrl+C to stop the server")
    print("="*60 + "\n")

    try:
        subprocess.run(f"{npm_cmd} start", shell=True, cwd=os.path.dirname(os.path.abspath(__file__)))
    except KeyboardInterrupt:
        print("\n\nServer stopped. Goodbye!")

if __name__ == "__main__":
    main()
