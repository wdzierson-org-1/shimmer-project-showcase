"""Render the original, 54-second instrumental bed for 'Still asking why'.

Uses only Python's standard library and ffmpeg. No samples or external audio.
Run from the repository root: python3 scripts/portfolio/render_question_score.py
"""
from array import array
import math
from pathlib import Path
import subprocess
import tempfile
import wave

RATE = 24000
DURATION = 54
TAU = math.tau
CHORDS = [
    [50, 57, 61, 64, 69],  # Dmaj9: an open question
    [47, 54, 57, 62, 66],  # Bm7: learning, a little inward
    [43, 55, 59, 62, 69],  # Gmaj9: a wider world
    [50, 57, 61, 64, 66],  # Dmaj9: warmth, care
    [40, 55, 59, 62, 66],  # Em9: another possibility
    [50, 57, 61, 64, 69],  # Return to the opening, still unresolved
]
# Sparse, deliberately unhurried phrases, one per chapter.
PHRASES = [[69, 73, 76], [66, 69, 62], [74, 78, 81], [76, 73, 69], [71, 78, 74], [69, 76, 73]]


def frequency(note):
    return 440 * 2 ** ((note - 69) / 12)


def main():
    count = RATE * DURATION
    left = array('f', [0]) * count
    right = array('f', [0]) * count
    for chapter, chord in enumerate(CHORDS):
        start, end = max(0, chapter * 9 - 2), min(DURATION, (chapter + 1) * 9 + 2)
        for voice, note in enumerate(chord):
            f = frequency(note)
            pan = .2 + voice * .15
            for i in range(int(start * RATE), int(end * RATE)):
                t = i / RATE
                attack = min(1, (t - start) / 3)
                release = min(1, (end - t) / 3)
                envelope = math.sin(attack * math.pi / 2) ** 2 * math.sin(release * math.pi / 2) ** 2
                breath = .86 + .14 * math.sin(t * .39 + voice)
                tone = (math.sin(TAU * f * t) + .26 * math.sin(TAU * f * 1.0012 * t + .4)
                        + .10 * math.sin(TAU * f * 2 * t))
                value = tone * envelope * breath * .038
                left[i] += value * math.sqrt(1 - pan)
                right[i] += value * math.sqrt(pan)
        for hit, note in enumerate(PHRASES[chapter]):
            start = chapter * 9 + 1.6 + hit * 2.15
            f, pan = frequency(note), [.35, .65, .5][hit]
            # Soft mallet/piano-like attack, with only synthesized harmonics.
            for i in range(int(start * RATE), min(count, int((start + 6) * RATE))):
                t = i / RATE - start
                envelope = (1 - math.exp(-t * 48)) * math.exp(-t / 1.65)
                tone = math.sin(TAU * f * t) + .19 * math.sin(TAU * f * 2.002 * t) * math.exp(-t * 1.8)
                value = tone * envelope * .085
                left[i] += value * math.sqrt(1 - pan)
                right[i] += value * math.sqrt(pan)
    # A quiet stereo echo supplies space; the final chord fades before the reel ends.
    delay = int(RATE * .39)
    pcm = array('h')
    for i in range(count):
        t = i / RATE
        fade = min(1, t / 2) * min(1, (DURATION - t) / 4) ** 1.5
        l, r = left[i], right[i]
        if i >= delay:
            l += right[i - delay] * .19
            r += left[i - delay] * .19
        pcm.extend((int(max(-1, min(1, l * fade)) * 32767), int(max(-1, min(1, r * fade)) * 32767)))
    output = Path('public/portfolio/reel/question-score.m4a')
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='question-score-') as directory:
        source = Path(directory) / 'score.wav'
        with wave.open(str(source), 'wb') as track:
            track.setnchannels(2)
            track.setsampwidth(2)
            track.setframerate(RATE)
            track.writeframes(pcm.tobytes())
        subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(source),
                        '-af', 'loudnorm=I=-24:TP=-3:LRA=8', '-ar', '44100', '-c:a', 'aac',
                        '-b:a', '112k', '-movflags', '+faststart', str(output)], check=True)
    print(f'Rendered {output}: {DURATION} seconds')


if __name__ == '__main__':
    main()
