"""Gemini plant diagnosis, shared by every image source.

Used by POST /api/crop-health/diagnose (a farmer's phone photo, main.py) and by
the bed camera's automatic health checks (camera.py). One prompt, one parser,
so both paths return the same shape and improve together.
"""

import json

from fastapi import HTTPException
from google import genai

import llm

# Photo-source specific framing. The camera sees a whole bed from above at
# 800x600, not a close-up of one leaf, so the model is told what it can and
# can't reasonably judge from that view.
SOURCE_CONTEXT = {
    "phone": (
        "A farmer has photographed a plant (leaf, stem, or whole plant) with their phone and "
        "wants to know if it's healthy, and if not, what's wrong and what to do about it."
    ),
    "bed-camera": (
        "This image comes from a fixed camera mounted on a stand above a whole growing bed "
        "(roughly 800x600 pixels, looking down at several plants at once). Judge the bed as a "
        "whole: canopy colour, wilting, yellowing or browning, holes or chewed leaves, bare "
        "patches, and signs of over- or under-watering. Individual small pests or fine leaf "
        "spots may not be visible at this resolution: do not claim to see what you can't, and "
        "lower confidencePct accordingly. If the image is too dark, blurred, fogged, or doesn't "
        "show plants, use healthStatus \"unclear\"."
    ),
}


def diagnose_image(image_base64: str, mime_type: str, crop_name: str | None = None,
                   source: str = "phone") -> dict:
    """Run one diagnosis. Raises HTTPException with a user-readable detail on failure."""
    llm.require_key()

    crop_hint = f" The farmer says this is a {crop_name} plant." if crop_name else ""
    system_prompt = (
        "You are a plant pathologist assisting smallholder farmers in Zimbabwe. "
        + SOURCE_CONTEXT.get(source, SOURCE_CONTEXT["phone"]) + crop_hint + " "
        "Look carefully at the image and respond with ONLY a JSON object (no markdown, no code "
        "fences) matching exactly this shape:\n"
        '{"plantIdentified": string, "healthStatus": "healthy" | "diseased" | "pest" | '
        '"nutrient_deficiency" | "unclear", "condition": string, "confidencePct": number, '
        '"severity": "none" | "low" | "moderate" | "high", "description": string, '
        '"treatment": string, "preventionTips": string}\n\n'
        "plantIdentified: your best guess at the plant/crop shown. condition: the specific "
        'disease/pest/deficiency name, or "Healthy" if nothing is wrong. description: 1-2 plain '
        "sentences on what you actually observe in the image (spots, discoloration, wilting, "
        "insects, etc.) and why it points to that condition. treatment: concrete, actionable steps "
        "a smallholder farmer can take, favoring low-cost/organic options where reasonable. "
        "preventionTips: 1 sentence on avoiding this going forward. If the image doesn't clearly "
        'show a plant, set healthStatus to "unclear" and explain why in description.'
    )

    contents = [
        {
            "role": "user",
            "parts": [
                {"inline_data": {"mime_type": mime_type, "data": image_base64}},
                {"text": "Diagnose this plant." if source == "phone" else "Assess the health of this bed."},
            ],
        }
    ]

    # Shares the retry / timeout / model-fallback path with the assistant, so a
    # busy model does not turn into a failed diagnosis on the farmer's phone.
    response = llm.generate(
        contents,
        config=genai.types.GenerateContentConfig(
            system_instruction=system_prompt,
            response_mime_type="application/json",
        ),
        what="Diagnosis request",
    )

    try:
        diagnosis = json.loads(response.text or "{}")
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="The AI response could not be parsed. Please try again.")
    if not isinstance(diagnosis, dict):
        raise HTTPException(status_code=502, detail="The AI response had an unexpected shape. Please try again.")
    return diagnosis
