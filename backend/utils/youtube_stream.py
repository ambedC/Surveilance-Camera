import subprocess
import sys

def get_youtube_stream_url(youtube_url):
    try:
        cmd = [
            sys.executable,
            "-m",
            "yt_dlp",
            "-f",
            "best",
            "-g",
            youtube_url
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True
        )

        return result.stdout.strip()

    except Exception as e:
        print("❌ yt-dlp failed:", e)
        return None
