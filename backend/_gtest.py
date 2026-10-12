import os, time
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))
from google import genai
from google.genai import errors as E

c = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
for model in ["gemini-3.6-flash", "gemini-3.7-flash", "gemini-3.5-flash", "gemini-flash-latest"]:
    for attempt in (1, 2):
        t0 = time.time()
        try:
            r = c.models.generate_content(model=model, contents="Reply with the single word OK.")
            print(f"{model:22s} try{attempt}  OK   {time.time()-t0:4.1f}s  -> {(r.text or '').strip()[:20]!r}")
            break
        except E.ServerError as e:
            print(f"{model:22s} try{attempt}  ServerError {getattr(e,'code','?')}  {time.time()-t0:4.1f}s  {str(e.message)[:70]}")
        except E.ClientError as e:
            print(f"{model:22s} try{attempt}  ClientError {getattr(e,'code','?')}  {str(e.message)[:70]}")
            break
        except Exception as e:
            print(f"{model:22s} try{attempt}  {type(e).__name__}: {str(e)[:70]}")
            break
