---
layout: case_study
title: "JobEasy"
description: "A job aggregation and tracking app for junior developers job hunting in Japan. It scrapes listings every morning from sites like Wantedly, CareerForum, and japan-dev, gives AI-based feedback on your resume, has a built-in resume editor, an interview coach feature, and even flags whether a job listing is actually worth applying to."
project: "JobEasy"
og_type: "article"
cover: "projects/jobeasy-main.png"
cover_alt: "JobEasy home page: the headline “Your job search, all in one place” beside a preview of the application tracker"
---

<nav class="toc" aria-label="On this page" markdown="1">
<p class="toc-label">On this page</p>

* TOC
{:toc}
</nav>

## Summary

JobEasy brings a junior developer's whole job search into one app. It scrapes junior listings from Wantedly, CareerForum, and japan-dev every morning, tells you whether a posting is worth applying to, lets you tailor your resume without leaving the browser, and attaches a task list and interview coach to every application.

Key new concepts I learned building it:

- Stateful session-based Authorization with Devise and Authentication with Pundit
- Scheduled web scrapers as background jobs against JSON APIs and plain HTML
- Integration of thid-party API (OnlyOffice Text Editor) with JWT authentication and callbacks
- LLM Integration with OpenAI through RubyLLM that stores as JSONB object (RubyLLM Schema)


## Target user

Junior developers job hunting in Japan: people applying for their first or second tech role, usually juggling several job boards at once.

## The problem

**“I can't find junior jobs on LinkedIn.”**
Most junior developers rely on LinkedIn as a job board, but it's also the most competitive. Dozens of smaller, less saturated boards exist, but checking them all individually, every day, isn't sustainable.

**“I don't think I'm qualified, so I'm not going to apply.”**
Many junior candidates skip applying the moment a posting lists “2+ years experience,” even when they'd be a reasonable fit. They have no easy way to gauge whether it's actually worth the shot.

**“I use too many tools for my job hunt.”**
A single job search routine ends up spread across 5–10 job board logins, a spreadsheet for tracking, Microsoft Word for tailoring each resume to a new JD, and Claude or ChatGPT in a separate tab for interview prep.

**“I don't know what to do after applying or interviewing.”**
After an application or interview is logged, there's rarely a clear next step. No reminder to follow up, and no structured way to know what the interview will cover.

## Features

Consolidated job aggregation
: Scrapes and consolidates listings from multiple sources (Wantedly, CareerForum, japan-dev) into a single feed, so there's no more manually checking a dozen boards a day.

AI-powered “worth applying” verdict
: Analyzes each job listing against your resume and gives a structured, honest read on fit, so a “2+ years experience” line doesn't automatically rule you out before you've considered whether you're actually close enough to apply.

All-in-one workflow
: An in-browser resume editor lets you tailor your CV to a specific JD without leaving the app or opening Word, and applications are tracked in one place instead of a separate spreadsheet.

Built-in interview coach and task list
: Tied to each application, a chat-based coach and to-do list, so there's no more confusion about what to do next or what to follow up on.

![Application tracker with columns for Saved, Applied, Interviewed, Offered, and Accepted; each card shows the company, date, and number of tasks](/images/projects/jobeasy-applications.png)

## Database design

![JobEasy database schema](/images/projects/jobeasy-schema.png)


Key points:

- **Users and job openings** are related through a join table, `job_applications`. A user has many job applications, and has many job openings through job applications.
- **Resumes and job applications** have a 1:N relationship, hence the foreign key on the `resumes` table. A user has many resumes through their job applications, while each resume belongs to one job application.

## Technical challenges

### OnlyOffice API integration

I tried many different options for integrating a text editor into the app. We settled on OnlyOffice because it has:

1. An appealing UI
2. Concurrent saving
3. The ability to keep the indentation, bold text, and other styling choices in a CV

![JobEasy resume editor: an OnlyOffice document editor showing a CV, with “Apply for this job” and “Ask JobEasy for suggestions” buttons and AI advice cards on the right](/images/projects/jobeasy-resume.png)

Here's the flow:

1. **Upload resume.**
   The user uploads a `.docx` document, which calls `POST /resumes`.
   - The document is saved on the `Resume` instance as an Active Storage (Cloudinary) file.
   - `extract_content` converts the document into text and saves it as `content` on the `Resume`.
   - A random callback token is created for this instance.
   - Once complete, the user is redirected to the resume edit page (`GET /resumes/:id/edit`).

2. **Rails builds a signed editor config.**
   `ResumesController#edit` builds a config hash for the OnlyOffice editor and signs it as a JWT. The config is rendered into the edit page, where the browser passes it to `DocsAPI.DocEditor`, which sends it to the OnlyOffice server. The JWT consists of:
   - **Header:** the HS256 algorithm
   - **Payload:** a hash of the document URL (Cloudinary URL), document key, file type, callback URL, and user
   - **Signature:** HS256 of the header and payload, computed with `ONLYOFFICE_JWT_SECRET`

   Documentation: [Config](https://api.onlyoffice.com/docs/docs-api/usage-api/config/), [Document](https://api.onlyoffice.com/docs/docs-api/usage-api/config/document/), [Editor](https://api.onlyoffice.com/docs/docs-api/usage-api/config/editor/)

3. **Browser mounts the editor.**
   The view loads `api.js` from the OnlyOffice server as a script.

4. **OnlyOffice fetches the file.**
   - The OnlyOffice server verifies the config's JWT using the shared secret.
   - It downloads the `.docx` from the Cloudinary URL.
   - It converts the file and caches it under `document.key`, which changes on every save.

5. **User edits.**

6. **Closing the editor triggers a save.**
   OnlyOffice builds a finished `.docx` from the edits and sends a request to the callback URL with `status: 2` and a link to the finished file.

7. **A background job stores the new version.**
   - `ResumeSaveJob` downloads the finished `.docx` and replaces the old file on Cloudinary with the new one.
   - It updates the resume's `updated_at`, which changes `document.key`, so the next editor session loads the new file.

### Job board scraper

Three background jobs, triggered by a rake task. I schedule the task with Heroku Scheduler so it runs every day at 9 AM Japan time.

![JobEasy job list: listings from Accenture, Otsuka, BrainPad, and Game Freak, with filters for All, CFN, Japandev, and Wantedly and a count of 56 junior openings](/images/projects/jobeasy-list.png)

Here's the flow:

1. **Heroku Scheduler triggers** `rails jobs:scrape`.

2. **`ScrapeJapandevJob`**
   - Sends a request to Japan Dev's Meilisearch API, filtered to `junior` and `new_grad` seniority.
   - For each listing, fetches the company's jobs from the API to get the full job description and company info.
   - Converts the HTML job description into plain text with Nokogiri.
   - Sleeps 0.3 seconds between requests.
   - Saves the results into an array of company and job opening hashes, which are then used to create `Company` and `JobOpening` records.

3. **`ScrapeCFNJob`**
   - Requests pages 1–12 of the company list API, filtered to categories that contain “IT”.
   - For each job, calls the job API for the job description and salary. A regex finds any amounts ending in 円.
   - Saves the results into an array of company and job opening hashes, which are then used to create `Company` and `JobOpening` records.

4. **`ScrapeWantedlyJob`**
   - Gets search result pages 1–5 for Ruby, Tokyo, and 未経験.
   - Pulls the listing information out of the HTML with CSS selectors.
   - Opens each job page to get the job description, company info, and salary.
   - Saves the results into an array of company and job opening hashes, which are then used to create `Company` and `JobOpening` records.

### RubyLLM schema for CV recommendations

On the resume edit page, the user clicks “Ask JobEasy for suggestions”, and Rails sends the resume text and the job description to OpenAI through RubyLLM. To get a structured answer, I store the response as JSONB, which is how I learned to use a RubyLLM schema (`AiResponseSchema`).

1. **Get the resume text.**
   As in the upload flow, the document is saved on the `Resume` as an Active Storage (Cloudinary) file, and `extract_content` converts it into text saved as `content`.

2. **User asks for suggestions.**
   The button sends `POST /resumes/:id/recommendations`.

3. **Define the response shape.**
   The shape of the `ai_response` JSONB is defined up front:

   ~~~ ruby
   class AiResponseSchema < RubyLLM::Schema
     string :order_advice,      description: "..."   # where to place projects/experience
     string :summary_advice,    description: "..."   # how to write the top summary
     array  :additional_advice, of: :string, description: "..."  # up to 5 extra tips
   end
   ~~~

4. **Call the LLM.**
   The `recommendations` action in `ResumesController` calls the LLM:

   ~~~ ruby
   chat = RubyLLM.chat.with_schema(AiResponseSchema)
   response = chat.ask("You are a professional tech recruiter ... #{@resume.content} ... #{job_opening.title} ... #{job_opening.content} ...")
   ~~~

5. **Read the structured result and save it.**

6. **Display the suggestions.**
   Every piece of advice is rendered as a card. Clicking “×” sends `DELETE /resumes/:id/advices/:advice_id`, which adds that advice's id to `ai_response["dismissed"]`.

## Final result

You can try the app at [jobeasy.space](https://www.jobeasy.space){:target="_blank" rel="noopener noreferrer"}.
