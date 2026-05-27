import httpx

url = "https://stupid-rooms-glow.loca.lt/upload-audio"
headers = {
    "Bypass-Tunnel-Reminder": "true"
}

with open("test_audio.m4a", "wb") as f:
    f.write(b"RIFF....WAVEfmt ....data....")

files = {
    "file": ("test_audio.m4a", open("test_audio.m4a", "rb"), "audio/m4a")
}

try:
    print("Sending POST request via httpx to:", url)
    with httpx.Client() as client:
        response = client.post(url, headers=headers, files=files, timeout=30.0)
        print("Status Code:", response.status_code)
        print("Response JSON:", response.text)
except Exception as e:
    print("Error:", e)
