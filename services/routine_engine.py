import random

EXERCISES = [
 {"name":"Incline push-up","muscles":["Chest","Triceps","Shoulders"],"equipment":"Wall or sturdy bench","level":"Beginner","reps":"8–10","rest":45,"how":"Place hands on a wall or sturdy raised surface. Keep a long line from head to heels, lower with control, then press away.","cue":"Keep ribs stacked and elbows at a comfortable angle."},
 {"name":"Bench incline push-up","muscles":["Chest","Triceps","Shoulders"],"equipment":"Bench","level":"Beginner","reps":"6–10","rest":45,"how":"Use a sturdy, non-slip bench that cannot slide. Place hands under shoulders, step back to a comfortable incline, lower with control, and press away.","cue":"Check the bench is stable before starting; stop if wrists or shoulders feel uncomfortable."},
 {"name":"Bench incline push-up","muscles":["Chest","Triceps","Shoulders"],"equipment":"Bench","level":"Beginner","reps":"6–10","rest":45,"how":"Use a sturdy, non-slip bench that cannot slide. Place hands under shoulders, step back to a comfortable incline, lower with control, and press away.","cue":"Check the bench is stable before starting; stop if wrists or shoulders feel uncomfortable."},
 {"name":"Glute bridge","muscles":["Glutes","Hamstrings","Core stability"],"equipment":"Mat","level":"Beginner","reps":"10–12","rest":45,"how":"Lie on your back with knees bent. Press through both feet, lift hips comfortably, pause, and lower slowly.","cue":"Finish by squeezing your glutes; avoid arching your lower back."},
 {"name":"Chair squat","muscles":["Quadriceps","Glutes","Hip muscles"],"equipment":"Chair","level":"Beginner","reps":"8–10","rest":60,"how":"Stand in front of a stable chair, send hips back to tap the seat, then stand tall with control.","cue":"Keep the chair steady and knees tracking in line with toes."},
 {"name":"Bird dog","muscles":["Core stability","Upper back","Glutes"],"equipment":"Mat","level":"Beginner","reps":"6 each side","rest":40,"how":"From hands and knees, extend opposite arm and leg without shifting your trunk. Return and alternate.","cue":"Move slowly; keep hips level and spine comfortable."},
 {"name":"Dead bug","muscles":["Upper abs","Lower abs","Core stability"],"equipment":"Mat","level":"Beginner","reps":"6 each side","rest":45,"how":"Lie on your back with arms up and knees bent. Lower opposite arm and heel only as far as you can maintain control.","cue":"Use a smaller range if your back feels strained."},
 {"name":"Standing calf raise","muscles":["Calves","Ankles"],"equipment":"Wall","level":"Beginner","reps":"12–15","rest":40,"how":"Stand near a wall, rise onto the balls of both feet, pause, and lower slowly.","cue":"Use the wall for balance and keep the movement smooth."},
 {"name":"Prone W raise","muscles":["Upper back","Trapezius","Shoulders"],"equipment":"Mat","level":"Beginner","reps":"8–10","rest":45,"how":"Lie face down or hinge forward. Draw elbows toward your sides in a W shape, pause, and release gently.","cue":"Keep shoulders away from ears; use a small pain-free range."},
 {"name":"Reverse lunge","muscles":["Quadriceps","Hamstrings","Glutes"],"equipment":"Bodyweight","level":"Intermediate","reps":"6 each side","rest":60,"how":"Step one foot back to a comfortable split stance, lower slightly, then push through the front foot to return.","cue":"Hold a wall for balance and shorten the step if needed."},
 {"name":"Arm circles","muscles":["Shoulders","Mobility"],"equipment":"None","level":"Beginner","reps":"20 seconds each way","rest":30,"how":"Stand tall and draw small, controlled circles with relaxed arms. Reverse direction halfway.","cue":"Keep the circles comfortable and shoulders relaxed."},
 {"name":"Wall sit","muscles":["Quadriceps","Glutes","Core stability"],"equipment":"Wall","level":"Beginner","reps":"20–30 seconds","rest":60,"how":"Slide down a wall only to a comfortable height. Hold while breathing steadily, then stand up slowly.","cue":"Stop before discomfort; you do not need a deep knee bend."},
 {"name":"Standing hip hinge","muscles":["Hamstrings","Glutes","Lower back"],"equipment":"None","level":"Beginner","reps":"10–12","rest":45,"how":"Soften your knees and push hips back with a long spine. Stand by driving hips forward gently.","cue":"Keep the movement in a comfortable range and spine neutral."},
 {"name":"Forearm wall press","muscles":["Chest","Shoulders","Core stability"],"equipment":"Wall","level":"Beginner","reps":"8–10","rest":45,"how":"Place forearms on a wall at shoulder height. Gently press into the wall while keeping your trunk steady.","cue":"Breathe normally; this is a controlled isometric effort."},
 {"name":"Side-lying clam","muscles":["Glutes","Hip muscles","Obliques"],"equipment":"Mat","level":"Beginner","reps":"10 each side","rest":40,"how":"Lie on your side with knees bent and feet together. Open the top knee without rolling your pelvis back.","cue":"Make the range small enough to keep your hips stacked."},
 {"name":"Wrist mobility flow","muscles":["Forearms","Mobility"],"equipment":"None","level":"Beginner","reps":"30 seconds","rest":30,"how":"Gently circle wrists, then extend and flex them in a comfortable range.","cue":"No forcing or bouncing; stop with any sharp discomfort."},
 {"name":"Self-resisted curl","muscles":["Biceps","Forearms"],"equipment":"None","level":"Beginner","reps":"8 each side","rest":40,"how":"Hold one forearm palm-up and place the other hand over it. Curl gently against your hand’s light resistance, then lower slowly.","cue":"Use only easy resistance; keep the wrist comfortable and shoulders relaxed."},
 {"name":"Close wall press","muscles":["Triceps","Chest","Shoulders"],"equipment":"Wall","level":"Beginner","reps":"6–8","rest":45,"how":"Face a wall and place hands a little closer than shoulder-width. Bend elbows gently, move toward the wall, then press back.","cue":"Stay upright and use a range that feels easy on your shoulders."},
 {"name":"Wall lat reach","muscles":["Lats","Mobility","Shoulders"],"equipment":"Wall","level":"Beginner","reps":"20 seconds each side","rest":30,"how":"Face a wall, place one hand at a comfortable height, and gently shift hips back until you feel an easy side-body stretch.","cue":"A gentle stretch only—do not push into shoulder discomfort."},
 {"name":"Gentle shoulder shrug","muscles":["Trapezius","Upper back"],"equipment":"None","level":"Beginner","reps":"8–10","rest":30,"how":"Let arms rest by your sides. Slowly lift shoulders toward ears, pause, then release fully.","cue":"Keep the movement small and avoid rolling or forcing the neck."},
 {"name":"Bent-knee side plank","muscles":["Obliques","Core stability"],"equipment":"Mat","level":"Beginner","reps":"10–20 seconds each side","rest":45,"how":"Lie on your side with knees bent and forearm under shoulder. Lift hips slightly, hold while breathing, then lower.","cue":"Keep the hold short and comfortable; skip if your shoulder or back hurts."},
 {"name":"Standing cross-body march","muscles":["Coordination","Core stability","General conditioning"],"equipment":"Wall","level":"Beginner","reps":"30 seconds","rest":30,"how":"March slowly in place, bringing one knee up as the opposite arm moves forward. Alternate sides at an easy pace.","cue":"Stand near support if balance feels uncertain; slow down as needed."},
 {"name":"Supported hip march","muscles":["Hip muscles","Quadriceps","Coordination"],"equipment":"Wall","level":"Beginner","reps":"8 each side","rest":30,"how":"Stand beside a stable support and lift one knee a short distance, lower with control, then switch sides.","cue":"Use the support for balance and keep the movement pain-free."},
 {"name":"Gentle standing trunk turn","muscles":["Obliques","Mobility","Coordination"],"equipment":"None","level":"Beginner","reps":"6 each side","rest":30,"how":"Stand comfortably with arms crossed loosely. Turn your upper body a small amount each way while keeping hips relaxed.","cue":"Use a small range and avoid twisting through pain."},
 {"name":"Dumbbell floor press","muscles":["Chest","Triceps","Shoulders","Functional strength"],"equipment":"Dumbbells","level":"Beginner","reps":"8–10","rest":60,"how":"Lie on a mat with light dumbbells above your chest. Lower until upper arms gently meet the floor, then press upward smoothly.","cue":"Use light weights, keep wrists stacked, and stop before discomfort."},
 {"name":"Resistance-band row","muscles":["Lats","Upper back","Biceps","Trapezius"],"equipment":"Resistance band","level":"Beginner","reps":"8–12","rest":50,"how":"Secure a resistance band safely at chest height. Pull elbows toward your sides, pause, then release slowly.","cue":"Check the band and anchor first; keep shoulders relaxed and control the return."},
 {"name":"Light dumbbell curl","muscles":["Biceps","Forearms"],"equipment":"Dumbbells","level":"Beginner","reps":"8–10","rest":40,"how":"With very light dumbbells by your sides, bend your elbows to curl, then lower slowly without swinging.","cue":"Choose a manageable weight and keep wrists relaxed."},
 {"name":"Supported sit-to-stand","muscles":["Functional strength","Quadriceps","Glutes"],"equipment":"Chair","level":"Beginner","reps":"6–8","rest":60,"how":"From a stable chair, lean forward slightly, stand with control, then reach hips back to sit gently.","cue":"Use arm support if needed; keep the chair against a wall."},
 {"name":"Supported hip march","muscles":["Hip muscles","Quadriceps","Coordination"],"equipment":"Wall","level":"Beginner","reps":"8 each side","rest":30,"how":"Stand beside a stable support and lift one knee a short distance, lower with control, then switch sides.","cue":"Use the support for balance and keep the movement pain-free."},
]

def build_routine(payload):
    focus = payload.get("focus", "Full body")
    selected = payload.get("muscles") or []
    level = payload.get("experience", "Beginner")
    equipment = payload.get("equipment", [])
    minutes = max(10, min(int(payload.get("minutes", 20)), 60))
    limitations = str(payload.get("limitations", "")).strip()
    if limitations:
        return {"needs_guidance": True, "message": "Because you noted a movement limitation, I won’t guess which exercises are suitable. Please check with a qualified health professional before training; you can clear this field to build a general low-impact plan.", "exercises": []}
    candidates = [e for e in EXERCISES if e["level"] == "Beginner" or level != "Beginner"]
    if selected:
        preferred = [e for e in candidates if any(m in selected for m in e["muscles"])]
        candidates = preferred or candidates
    if equipment:
        if "No equipment" in equipment:
            candidates = [e for e in candidates if e["equipment"] in ("None", "Bodyweight", "Wall")]
            random.shuffle(candidates)
        else:
            matched = [e for e in candidates if e["equipment"] in equipment]
            alternatives = [e for e in candidates if e["equipment"] in ("None", "Bodyweight", "Wall")]
            random.shuffle(matched)
            random.shuffle(alternatives)
            candidates = matched + alternatives
    else:
        random.shuffle(candidates)
    count = max(3, min(8, minutes // 4))
    exercises = [{**e, "sets": 2 if level != "Beginner" else 1} for e in candidates[:count]]
    return {"needs_guidance": False, "focus": focus, "duration": minutes, "exercises": exercises, "message": "Protocol ready. Begin at a comfortable pace, take the full rest you need, and stop if you feel pain or unwell."}
