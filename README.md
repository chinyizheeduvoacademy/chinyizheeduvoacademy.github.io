# LvxPaths 🛡️

> **Free, curated, browser-saved offensive security roadmaps & hands-on labs.**  
> Built for students, self-taught hackers, and security researchers. Zero paywalls, zero fluff.

🌐 **Live Platform**: [https://lvxcloudevs.me](https://lvxcloudevs.me)  
👨‍💻 **Curated & Maintained by**: [Chin Yi Zhe](https://github.com/chinyizheeduvoacademy) (`chinyizheeduvoacademy` · KL)

---

## 🎯 What is LvxPaths?

Breaking into cybersecurity shouldn't require a $5,000 bootcamp or scattered book lists. **LvxPaths** provides structured, battle-tested learning paths designed to take learners from foundational fundamentals directly to industry-standard offensive security readiness.

* **100% Privacy-First**: All your progress, milestone completions, and active tracks are saved directly in your browser's local storage. No forced registration, no tracking cookies.
* **Interactive Labs**: Launch containerized lab environments (OWASP Juice Shop, ROP Emporium, Exploit Education) directly from relevant curriculum milestones.
* **High-Signal Curricula**: Hand-picked references to authoritative industry materials: PortSwigger Web Security Academy, Phrack, LiveOverflow, Corelan, OWASP Top 10, and real-world CVE writeups.

---

## 🗺️ Learning Tracks

| Track | Level | Milestones | Core Focus Areas |
| :--- | :--- | :--- | :--- |
| **🌐 Web Pentesting & Bug Bounty** | Beginner → Intermediate | 12 milestones · ~80h | HTTP protocol, OWASP Top 10, IDOR/BOLA, JWT authentication, SSRF, SQLi, PortSwigger labs |
| **🧠 AI & LLM Security** | Intermediate → Advanced | 10 milestones · ~60h | OWASP LLM Top 10, prompt injection, RAG poisoning, indirect injection, model theft, agent security |
| **⚡ Exploit Writing** | Advanced | 8 milestones · ~90h | x86/x64 assembly, stack overflows, ROP chain construction, format string bugs, shellcoding |
| **🐧 Linux Privilege Escalation** | Beginner → Intermediate | 9 milestones · ~45h | Kernel exploits, SUID binaries, sudo privilege abuse, capability hijacking, cron race conditions |
| **🎯 Red Team Operations** | Advanced | 11 milestones · ~100h | Active Directory attacks, Kerberoasting, BloodHound enumeration, C2 architecture, lateral movement |

---

## 🏗️ Technical Architecture

LvxPaths is engineered for sub-second performance, high reliability, and low footprint:

```
┌──────────────────────────────────────────────┐
│             LvxPaths Client                  │
│   Next.js 15 · React · Tailwind CSS · Lucide  │
└──────────────────────┬───────────────────────┘
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
┌──────────────┐              ┌────────────────┐
│ Browser      │              │ Cloudflare     │
│ LocalStorage │              │ Worker Edge    │
│ (Progress)   │              │ (/api/track)   │
└──────────────┘              └────────┬───────┘
                                       │
                                       ▼
                              ┌────────────────┐
                              │ ClickHouse     │
                              │ Cloud          │
                              │ (Telemetry MV) │
                              └────────────────┘
```

* **Frontend**: Next.js App Router static export, fully responsive, dark-mode-first cyber aesthetic.
* **Telemetry**: Anonymized completion metrics aggregated via ClickHouse `SummingMergeTree` materialized views for global course completion analytics.
* **Lab Engine**: On-demand Docker container orchestration via Fly.io Machines API with local sandbox fallback.

---

## 💻 Local Development

Clone the repository and run the local development server:

```bash
# Clone the repository
git clone https://github.com/chinyizheeduvoacademy/chinyizheeduvoacademy.github.io.git
cd chinyizheeduvoacademy.github.io/lvxpaths

# Install dependencies (using Bun or npm)
bun install

# Start the development server
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to explore.

---

## 🤝 Contributing

Contributions of new learning paths, lab modules, or resource corrections are welcome:
1. Fork the repository.
2. Edit `public/data/catalog.json` to propose new curriculum milestones or resources.
3. Submit a Pull Request.

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.
