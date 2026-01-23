import os
import sys
import subprocess
import json
import re
from datetime import datetime
from pathlib import Path
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn, BarColumn, TaskProgressColumn
from rich.panel import Panel
from rich.theme import Theme

# Define custom theme
custom_theme = Theme({
    "info": "dim cyan",
    "warning": "magenta",
    "danger": "bold red",
    "success": "bold green",
})

console = Console(theme=custom_theme)

def load_env():
    """Load environment variables from .env file"""
    env_path = Path('.env')
    if not env_path.exists():
        console.print("[warning].env file not found![/warning]")
        return
    
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            try:
                key, value = line.split('=', 1)
                os.environ[key] = value
            except ValueError:
                pass

def run_command(command, description):
    """Run a shell command and return the output"""
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            check=True, 
            stdout=subprocess.PIPE, 
            stderr=subprocess.PIPE,
            text=True
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        console.print(f"\n[danger]Error during: {description}[/danger]")
        console.print(f"[danger]Command failed: {command}[/danger]")
        console.print(Panel(e.stderr, title="Error Output", border_style="red"))
        # Don't exit immediately, let the caller decide or raise
        raise e

def increment_version():
    """Increment version in version.json"""
    try:
        with open("version.json", "r") as f:
            data = json.load(f)
        
        old_ver = float(data.get("version", "0.00"))
        new_ver = old_ver + 0.01
        new_ver_str = "{:.2f}".format(new_ver)
        
        data["version"] = new_ver_str
        
        with open("version.json", "w") as f:
            json.dump(data, f, indent=4)
        
        return new_ver_str
    except Exception as e:
        console.print(f"[danger]Failed to increment version: {e}[/danger]")
        sys.exit(1)

def update_html_timestamp():
    """Update index.html with new timestamp"""
    try:
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        with open("index.html", "r") as f:
            content = f.read()
        
        # Replace existing version tags
        content = re.sub(r'(src="src/[^"?]+\.js)\?v=[^"]*(")', f'\\1?v={timestamp}\\2', content)
        # Add version tags to those missing them
        content = re.sub(r'(src="src/[^"?]+\.js)(")', f'\\1?v={timestamp}\\2', content)
        
        with open("index.html", "w") as f:
            f.write(content)
            
    except Exception as e:
        console.print(f"[danger]Failed to update timestamp: {e}[/danger]")
        sys.exit(1)

def print_uploaded_files(output, indent="    "):
    """Parse rsync output and print uploaded files"""
    lines = output.splitlines()
    uploaded = []
    for line in lines:
        # Filter out rsync noise and summary
        if not line or line.startswith("sending incremental file list"):
            continue
        if "sent" in line and "received" in line and "bytes" in line:
            continue
        if "total size" in line:
            continue
        # Filter out directories (usually end with /) unless it's a specific requirement, but user wants "files"
        # rsync -avz lists directories too.
        if line.endswith('/'):
            continue
        uploaded.append(line)
        
    if uploaded:
        for f in uploaded:
            console.print(f"{indent}[dim]• {f}[/dim]")

def main():
    console.clear()
    console.print(Panel.fit(
        "[bold magenta]Seek The Scounge[/bold magenta] [cyan]Deployment System[/cyan]", 
        subtitle="v1.0",
        border_style="cyan"
    ))
    
    load_env()

    # Check for required env vars
    required_vars = ["FTP_PRIVATE_KEY", "FTP_USER", "FTP_SERVER", "FTP_REMOTE_DIR"]
    missing = [v for v in required_vars if v not in os.environ]
    if missing:
        console.print(f"[danger]Missing environment variables: {', '.join(missing)}[/danger]")
        sys.exit(1)

    private_key = os.environ["FTP_PRIVATE_KEY"]
def get_changed_files(src_dir="src", reference_file="dist/bundle.js"):
    """Get list of files in src_dir newer than reference_file"""
    changed = []
    
    # If reference file doesn't exist, all files are 'new'
    if not os.path.exists(reference_file):
        return ["(Fresh Build)"]

    ref_mtime = os.path.getmtime(reference_file)
    
    for root, _, files in os.walk(src_dir):
        for f in files:
            full_path = os.path.join(root, f)
            if os.path.getmtime(full_path) > ref_mtime:
                # Make path relative to src for nicer display
                rel_path = os.path.relpath(full_path, start=src_dir)
                changed.append(rel_path)
                
    return sorted(changed)

def main():
    console.clear()
    console.print(Panel.fit(
        "[bold magenta]Seek The Scounge[/bold magenta] [cyan]Deployment System[/cyan]", 
        subtitle="v1.0",
        border_style="cyan"
    ))
    
    load_env()
    
    # Check for changes
    changed_files = get_changed_files()
    if changed_files:
        console.print("[yellow]Detected changes in source:[/yellow]")
        if changed_files == ["(Fresh Build)"]:
             console.print("    [dim]• Fresh Build (All files)[/dim]")
        else:
            for f in changed_files:
                console.print(f"    [dim]• {f}[/dim]")
        console.print("") # Add spacing

    # Check for required env vars
    required_vars = ["FTP_PRIVATE_KEY", "FTP_USER", "FTP_SERVER", "FTP_REMOTE_DIR"]
    missing = [v for v in required_vars if v not in os.environ]
    if missing:
        console.print(f"[danger]Missing environment variables: {', '.join(missing)}[/danger]")
        sys.exit(1)

    private_key = os.environ["FTP_PRIVATE_KEY"]
    if private_key.startswith("~"):
        private_key = os.path.expanduser(private_key)
    
    ftp_user = os.environ["FTP_USER"]
    ftp_server = os.environ["FTP_SERVER"]
    remote_dir = os.environ["FTP_REMOTE_DIR"]
    ssh_cmd = f"ssh -i {private_key}"

    # Helper for menu-style formatting
    def menu_step(text, width=45):
        dots = "." * (width - len(text))
        return f"[cyan]{text}[/cyan] [dim]{dots}[/dim]"

    with Progress(
        TextColumn("{task.description}"),
        SpinnerColumn(spinner_name="dots", style="cyan", finished_text="[bold green]✔[/bold green]"),
        console=console,
        transient=False
    ) as progress:
        
        try:
            # 1. Version
            task_version = progress.add_task(menu_step("Incrementing version"), total=1)
            version = increment_version()
            progress.update(task_version, completed=1)
            # Print version explicitly since we removed it from the progress bar text
            # We can't easily print inside the progress context without breaking layout sometimes, 
            # but rich handles console.print cleanly.
            
            # 2. Prepare HTML
            task_prep = progress.add_task(menu_step("Preparing HTML"), total=1)
            run_command("cp index-prod.html index.html", "Copying index.html")
            progress.update(task_prep, completed=1)

            # 3. TypeScript
            task_ts = progress.add_task(menu_step("Compiling TypeScript"), total=1)
            run_command("npx tsc --project tsconfig.json", "Compiling TS")
            progress.update(task_ts, completed=1)

            # 4. Webpack
            task_pack = progress.add_task(menu_step("Bundling Webpack"), total=1)
            run_command("npx webpack --mode production", "Webpack Build")
            progress.update(task_pack, completed=1)

            # 5. Timestamp
            task_time = progress.add_task(menu_step("Updating Timestamps"), total=1)
            update_html_timestamp()
            progress.update(task_time, completed=1)

            # 6. Upload Main
            task_up_main = progress.add_task(menu_step("Uploading Manifests"), total=1)
            files = "index.html manifest.webmanifest service-worker.js version.json"
            rsync_cmd_1 = f"rsync -avz -e '{ssh_cmd}' {files} {ftp_user}@{ftp_server}:{remote_dir}/"
            out_main = run_command(rsync_cmd_1, "Uploading manifest files")
            progress.update(task_up_main, completed=1)
            print_uploaded_files(out_main)

            # 7. Upload Dist
            task_up_dist = progress.add_task(menu_step("Uploading Bundle"), total=1)
            rsync_cmd_2 = (
                f"rsync -avz --delete -e '{ssh_cmd}' dist/ "
                f"{ftp_user}@{ftp_server}:{remote_dir}/src/"
            )
            out_dist = run_command(rsync_cmd_2, "Uploading dist")
            progress.update(task_up_dist, completed=1)
            print_uploaded_files(out_dist)

            # 8. Upload Assets
            task_up_assets = progress.add_task(menu_step("Uploading Assets"), total=1)
            rsync_cmd_3 = (
                f"rsync -avz --delete -e '{ssh_cmd}' assets/ "
                f"{ftp_user}@{ftp_server}:{remote_dir}/assets/"
            )
            out_assets = run_command(rsync_cmd_3, "Uploading assets")
            progress.update(task_up_assets, completed=1)
            print_uploaded_files(out_assets)
            
        except Exception as e:
            console.print("[danger]Deployment Failed![/danger]")
            sys.exit(1)

    console.print(Panel("[bold green]Deployment Complete![/bold green]", border_style="green"))

if __name__ == "__main__":
    main()
