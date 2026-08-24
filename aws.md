# AWS Deployment Guide for LearnOS AI

## 1. Why AWS is Better for Your Resume (Compared to Render/Vercel)

Your friend is absolutely right. While platforms like Render and Vercel are incredibly easy to use (which is why developers love them for quick projects), they are "Platform-as-a-Service" (PaaS). They handle all the difficult server work for you behind the scenes.

**AWS (Amazon Web Services)** is "Infrastructure-as-a-Service" (IaaS). If you host on AWS, you have to configure the server yourself. Hiring managers and recruiters look for AWS experience because it proves:
1. **DevOps Skills:** You know how to SSH into a Linux server and write terminal commands.
2. **Server Architecture:** You understand how to set up `Nginx` (a reverse proxy) and `systemd` (background services).
3. **Scalability:** Enterprise companies use AWS. Showing you know the AWS dashboard (EC2, Security Groups) makes you immediately more hirable for Junior/Mid-level roles.

## 2. How to Host on AWS (100% Free Tier)

AWS offers a **Free Tier** for 12 months. You will not be charged as long as you strictly follow these rules:
* Only use **EC2 t2.micro** or **t3.micro** instances.
* Keep your storage under 30GB.
* Turn it off (Stop the Instance) if you are no longer using it.

### Step 1: Create the Server (EC2)
1. Go to [aws.amazon.com](https://aws.amazon.com/) and create a Free Tier account (it will ask for a credit card just to verify your identity, but won't charge it).
2. Go to the **EC2 Dashboard** and click **Launch Instance**.
3. Name it `LearnOS-Server`.
4. Choose **Ubuntu 22.04 LTS** as the Operating System.
5. Instance Type: Make sure it says **t2.micro (Free tier eligible)**.
6. Create a **Key Pair** (download the `.pem` file). You need this to log into your server!
7. Under Network Settings, allow **HTTP**, **HTTPS**, and **SSH** traffic.
8. Click Launch.

### Step 2: Connect to your Server
Open your terminal on your local computer and connect to the server using the `.pem` key you downloaded:
```bash
ssh -i /path/to/your/key.pem ubuntu@<your-aws-public-ip>
```

### Step 3: Install Dependencies
Once you are inside the AWS Ubuntu server, run these commands:
```bash
sudo apt update
sudo apt install python3-pip python3-venv nginx git
```

### Step 4: Clone Your Code & Setup Backend
```bash
# Clone your public github repo
git clone https://github.com/your-username/LearnOS.git
cd LearnOS/backend

# Setup Python environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create your .env file
nano .env
# (Paste your DATABASE_URL, GEMINI_API_KEY, etc. inside and save)
```

### Step 5: Run the App in the Background
On Render, you just told it to run `uvicorn`. On AWS, you have to create a system service so the app stays running even after you close your terminal.

```bash
sudo nano /etc/systemd/system/learnos.service
```
Paste this configuration:
```ini
[Unit]
Description=Gunicorn instance to serve LearnOS Backend
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/home/ubuntu/LearnOS/backend
Environment="PATH=/home/ubuntu/LearnOS/backend/venv/bin"
ExecStart=/home/ubuntu/LearnOS/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000

[Install]
WantedBy=multi-user.target
```
Start the service:
```bash
sudo systemctl start learnos
sudo systemctl enable learnos
```

### Step 6: Connect to the Frontend
You can keep your Frontend on Vercel (since Vercel is standard for React apps). You just need to change your Vercel Environment Variable `VITE_API_URL` to point to your new AWS server IP address (e.g., `http://<your-aws-ip>:8000/api`).

---
**Summary for Hiring:** If you complete this, you can write on your resume: *"Deployed scalable REST API backend on AWS EC2 Ubuntu instances, utilizing Systemd for process management and Neon Postgres for database hosting."* This sounds incredibly professional!
