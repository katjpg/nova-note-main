import requests
import os
from pathlib import Path

def verify_setup():
    """Verify the API setup and configuration"""
    results = {
        "checks": [],
        "success": True
    }
    
    # Check API health
    try:
        response = requests.get("http://localhost:8000/api/health")
        results["checks"].append({
            "name": "API Health",
            "status": "success" if response.ok else "failed",
            "details": response.json() if response.ok else response.text
        })
    except Exception as e:
        results["checks"].append({
            "name": "API Health",
            "status": "failed",
            "details": str(e)
        })
        results["success"] = False

    # Check required directories
    dirs_to_check = [
        "data/uploads",
        "data/notes",
        "data/docs",
        "data/chroma"
    ]
    
    for dir_path in dirs_to_check:
        path = Path(dir_path)
        exists = path.exists()
        results["checks"].append({
            "name": f"Directory Check: {dir_path}",
            "status": "success" if exists else "failed",
            "details": "Directory exists" if exists else "Directory missing"
        })
        if not exists:
            results["success"] = False
            try:
                path.mkdir(parents=True, exist_ok=True)
                results["checks"][-1]["details"] += " (created)"
            except Exception as e:
                results["checks"][-1]["details"] += f" (creation failed: {str(e)})"

    return results

if __name__ == "__main__":
    print("Verifying API setup...")
    results = verify_setup()
    
    print("\nSetup Verification Results:")
    print("-" * 50)
    for check in results["checks"]:
        print(f"\n{check['name']}:")
        print(f"Status: {check['status']}")
        print(f"Details: {check['details']}")
    
    print("\nOverall Status:", "SUCCESS" if results["success"] else "FAILED")