Here are all the tools used in your project, categorized:

---

## Language & Runtime

| **Python 3.14** | Backend language — all agents, API, vector stores |
| **Node.js** | Runs the React frontend via Vite |

---

## Frontend

| **React 18** | UI component library |
| **Vite 5** | Development server and build tool |
| **JavaScript (JSX)** | Frontend logic and components |
| **CSS3** | Styling both portals |

---

## Backend Framework

| **FastAPI** | Python web framework — handles all API endpoints |
| **Uvicorn** | ASGI server that runs FastAPI |
| **Pydantic** | Validates incoming API request data |

---

## AI & LLM

| **Ollama** | Local LLM runner — runs models on your machine for free |
| **Llama 3.2** | AI model for citizen portal answers |
| **Llama 3** | Backup model (also available on your machine) |
| **LLaVA** | Vision model (available on your machine) |

---

## Authentication & Security

| **PyJWT** | Creates and verifies JWT tokens for lawyer sessions |
| **Bar Council ID validation** | Verifies lawyer credentials before granting workspace access |

---

## Database & Storage

| **SQLite** | Lightweight local database — stores IPC sections, case law index, lawyer sessions |
| **CSV files** | Raw dataset storage for case law, FIR, consumer, cybercrime data |
| **JSON files** | IPC section data (`ipc.json`, `ipc_normalized.json`) |

---

## Vector Search & NLP

| **NumPy** | Powers the vector similarity search engine |
| **Bag-of-Words hashing** | Converts text to 512-dimension vectors for search |
| **Regex (re module)** | Fast keyword-based intent and domain detection |
| **Sentence Transformers** | Optional better embeddings (if installed) |

---

## Web Scraping

| **Requests** | HTTP requests for scraping IndianKanoon |
| **BeautifulSoup4** | Parses HTML from scraped legal pages |
| **Selenium** | Scrapes JavaScript-rendered pages for IPC data |

---

## Development Tools

| **VS Code** | Code editor |
| **Git** | Version control |
| **pip** | Python package manager |
| **npm** | Node package manager for frontend |
| **python-dotenv** | Loads environment variables from `.env` file |

---

## Data Sources

| **IndianKanoon** | Case law judgements and summaries |
| **LawRato** | IPC section descriptions, cognizable/bailable info |
| **IndiaCode (indiacode.nic.in)** | Statute text for IPC, CrPC, Consumer Act |
| **Cybercrime.gov.in** | Cybercrime offence data |
| **ConsumerAffairs.nic.in** | Consumer protection provisions |

---

## Summary in one line each
- **Ollama + Llama** → the brain
- **FastAPI** → the backbone
- **React + Vite** → the face
- **NumPy vectors** → the search engine
- **SQLite + CSV** → the memory
- **JWT** → the security guard
- **Selenium + BeautifulSoup** → the data collectors