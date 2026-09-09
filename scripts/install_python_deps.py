#!/usr/bin/env python3
import subprocess
import sys

def main():
    print("Checking and installing Python database dependencies...")
    try:
        import psycopg
        print("psycopg is already installed!")
    except ImportError:
        print("psycopg is not installed. Installing psycopg[binary]...")
        try:
            subprocess.run([sys.executable, "-m", "pip", "install", "psycopg[binary]"], check=True)
            print("Successfully installed psycopg!")
        except Exception as e:
            print(f"Failed to install psycopg automatically: {e}")
            print("Please run: pip install 'psycopg[binary]' manually.")
            sys.exit(1)

if __name__ == "__main__":
    main()
