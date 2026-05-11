Here are the skills of each agent in your project:

---

## 1. `legal_intent_agent`
**Skill: Understanding what the user wants**

Reads the user's query and classifies it into one of 8 intents:
- `fir` — wants to file a complaint
- `rights` — wants to know their legal rights
- `bail` — asking about bail
- `ipc_lookup` — wants info about a specific section
- `case_search` — looking for a case or judgement
- `draft` — wants a document drafted
- `strategy` — wants legal strategy
- `general` — anything else

Uses keyword matching first (fast), then asks Llama if no keyword matches.

---

## 2. `domain_router_agent`
**Skill: Knowing which law applies**

Takes the query and routes it to the correct legal domain:
- IPC (criminal law)
- Consumer Protection
- Cybercrime / IT Act
- FIR procedure
- Family law
- Civil law
- Constitutional law

This tells the system which vector store to search next.

---

## 3. `law_agent`
**Skill: Fetching the right law**

Acts as a librarian. Takes the domain from the router agent and pulls the most relevant law sections from the correct vector store. Also fetches FIR filing steps if the intent is FIR-related.

---

## 4. `explanation_agent`
**Skill: Explaining in the right tone**

The most important agent. Takes all the retrieved law data and generates the final answer. Has 3 different personalities:
- **Citizen mode** — simple language, warm tone, Class 10 level, ends with legal disclaimer
- **Lawyer mode** — precise, cites sections, uses markdown headings
- **Strategy mode** — structured memo with case analysis, arguments, counter-arguments, next steps

---

## 5. `reasoning_agent`
**Skill: Thinking before answering**

Runs a chain-of-thought analysis before the explanation is generated. Thinks through:
1. What is the core legal issue?
2. Which sections apply and why?
3. What are the procedural requirements?
4. Are there any ambiguities?
5. What is the strongest legal position?

This improves answer quality by giving the explanation agent a structured scaffold to work from.

---

## 6. `translation_agent`
**Skill: Speaking 11 Indian languages**

Handles multilingual support in both directions:
- **Input** — detects if the user wrote in Hindi, Kannada, Tamil etc. and translates to English for processing
- **Output** — translates the final English answer back to the user's language

Supports: English, Hindi, Kannada, Tamil, Telugu, Marathi, Bengali, Malayalam, Gujarati, Punjabi, Urdu.

---

## 7. `case_law_agent`
**Skill: Legal research**

Searches through 1,180+ case law records and enriches the results. Returns structured case summaries with:
- Case name and citation
- Court and year
- Key holding (one sentence)
- Why it's relevant to the query

Used exclusively in the **lawyer workspace** research tab.

---

## 8. `similar_case_agent`
**Skill: Finding precedents**

Given a fact pattern, finds the most factually and legally similar decided cases. Ranks them by relevance and also tells the lawyer whether each precedent is **favourable, unfavourable, or neutral** for their client. Used in the **Similar Cases** tab.

---

## 9. `document_agent`
**Skill: Drafting legal documents**

Drafts court-ready legal documents from scratch based on case facts provided by the lawyer. Can produce 5 document types:
- Bail application (Section 437/439 CrPC)
- Legal notice
- Vakalatnama
- Petition / Writ
- Complaint / FIR draft

Uses formal Indian court language, includes proper headings, RESPECTFULLY SHOWETH section, PRAYER clause, and signature block.

---

## How they work together

```
User query
    ↓
translation_agent     (translate to English if needed)
    ↓
legal_intent_agent    (what does the user want?)
    ↓
domain_router_agent   (which law applies?)
    ↓
law_agent             (fetch relevant sections)
    ↓
reasoning_agent       (think it through)
    ↓
explanation_agent     (generate the answer)
    ↓
translation_agent     (translate back if needed)
    ↓
Final response
```