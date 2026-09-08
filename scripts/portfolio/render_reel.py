"""Render the 66-second narrative career film from published portfolio media.

Requires Pillow, ffmpeg and ffprobe. Sources are staged in /tmp/portfolio-media
by their project UUID and media display_order. The source manifest and transcript
are emitted with the film. All score synthesis is original; source-video audio is
excluded. This is an edited retrospective, not a continuous product demonstration.
"""
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter
from pathlib import Path
import subprocess, json, math, random, wave, array

ROOT=Path(__file__).resolve().parents[2]
SRC=Path('/tmp/portfolio-media'); OUT=ROOT/'public/portfolio/reel'
BUILD=SRC/'narrative'; BUILD.mkdir(exist_ok=True); OUT.mkdir(parents=True,exist_ok=True)
FONT=ROOT/'public/lovable-uploads/PPMori-Regular.otf'
W,H,FPS=1280,720,24
INK='#f1f0e6'; MUTED='#bdc8b7'; ACCENT='#dce9ab'
# Durations and text are editorial choices; roles and project descriptions come
# from the public CMS and the executive resume supplied by Will.
SCENES=[
 dict(duration=5,act=0,year='2005—2026',company='A builder’s story',title='The interface changes.\nThe question stays.',line='How can technology become useful?',kind='title'),
 dict(duration=6,act=0,year='2005',company='Smithsonian / SIguide',title='Make discovery\ntangible.',line='An interactive guide to the world beyond the screen.',kind='image',file='7b4a9961-a088-46f4-bc88-8f0d64589227.png',color='#dedfd2'),
 dict(duration=7,act=0,year='2009',company='Google / Beijing',title='Start with real lives.',line='Field research became the foundation for a mobile experience.',kind='photo',file='dff59819-cbc1-46ab-8cef-011e0e2a963f-3.png'),
 dict(duration=5,act=1,year='2014—2018',company='Grand Rounds',title='Build the team.\nRaise the standard.',line='Building and leading Product Design and Research.',kind='title'),
 dict(duration=6,act=1,year='2019',company='DarwinAI / Obvious Ventures',title='Make the invisible\nunderstandable.',line='Giving people a way to interrogate machine learning.',kind='image',file='af307088-2085-4a60-b697-964b6b37eb82.png',color='#d8dadc'),
 dict(duration=7,act=1,year='2021—2022',company='The Public Health Company',title='Turn uncertainty\ninto a decision.',line='Disease signals. Operational risk. A clear next step.',kind='image',file='a29df936-41db-4244-b968-203b71235c76-0.png',color='#d9e4e7'),
 dict(duration=7,act=2,year='2023—2025',company='Noodle AI / Co-founder',title='When the answer\ndoesn’t exist,\nbuild it.',line='A company built around making personal health history useful.',kind='phone',file='e7149d46-fad6-477b-a91c-77e76723df7d-1.mp4',offset=23,color='#d7dbd0'),
 dict(duration=6,act=2,year='2024—2025',company='Included Health',title='Bring intelligence\ninto the work\nof care.',line='Designing and engineering multimodal AI experiences.',kind='image',file='cc5b34e1-e0a7-4a59-b3b6-c9e814585c34.png',color='#dbe1e4'),
 dict(duration=7,act=2,year='2025',company='Agentic OS',title='Design the behavior.\nBuild the system.',line='From interaction design to a working, agentic operating system.',kind='video',file='d8307ba2-cc0e-4fc5-bc00-48fd5458dd08-1.mp4',offset=103,color='#dcd9e5'),
 dict(duration=6,act=2,year='2026—',company='InsideTracker / VP, Product & Design',title='Lead the product.\nStay a builder.',line='Connecting scientific insight, product strategy, and craft.',kind='title'),
 dict(duration=4,act=2,year='WILL DZIERSON',company='Design + technology',title='Conceive. Design.\nBuild. Deploy.',line='25+ years of making ideas work in the world.',kind='title'),
]
ACTS=['01 / Understand people','02 / Make complexity usable','03 / Build what comes next']

def font(size):return ImageFont.truetype(str(FONT),size)
def txt(d,xy,value,size=20,fill=INK,spacing=5):d.multiline_text(xy,value,font=font(size),fill=fill,spacing=spacing)
def wrap(value,size,width):
 words=value.split();lines=['']
 for word in words:
  trial=(lines[-1]+' '+word).strip()
  if font(size).getlength(trial)>width and lines[-1]:lines.append(word)
  else:lines[-1]=trial
 return '\n'.join(lines)
def atmosphere():
 random.seed(51);im=Image.new('RGB',(W,H));pix=im.load()
 for y in range(H):
  for x in range(W):
   g=math.exp(-((x-1020)**2/(720**2)+(y-150)**2/(440**2)))
   b=math.exp(-((x-120)**2/(720**2)+(y-690)**2/(540**2)))
   noise=random.gauss(0,.9)
   pix[x,y]=(int(20+27*g+7*b+noise),int(30+29*g+10*b+noise),int(27+11*g+17*b+noise))
 d=ImageDraw.Draw(im)
 for r in range(120,1400,34):d.ellipse((940-r,150-r*.7,940+r,150+r*.7),outline=(64,77,58),width=1)
 return im
BG=atmosphere(); BG.save(BUILD/'atmosphere.jpg',quality=96)

def artwork(s,i):
 kind=s['kind'];bg=BG.copy()
 if kind in ('image','phone','video'):
  ImageDraw.Draw(bg).rectangle((472,94,1280,623),fill=s['color'])
  if kind=='image':
   im=Image.open(SRC/s['file']).convert('RGB');im.thumbnail((775,505),Image.Resampling.LANCZOS)
   bg.paste(im,(487+(775-im.width)//2,106+(505-im.height)//2))
 elif kind=='photo':
  im=Image.open(SRC/s['file']).convert('RGB');bg=ImageOps.fit(im,(W,H),Image.Resampling.LANCZOS,centering=(.5,.4))
  shade=Image.new('RGBA',(W,H));d=ImageDraw.Draw(shade)
  for y in range(H):
   a=int(55+185*max(0,(y-230)/(H-230)))
   d.line((0,y,W,y),fill=(9,20,16,min(240,a)))
  bg=Image.alpha_composite(bg.convert('RGBA'),shade).convert('RGB')
 bg.save(BUILD/f'art-{i}.jpg',quality=96)
 overlay=Image.new('RGBA',(W,H));d=ImageDraw.Draw(overlay)
 txt(d,(46,33),'WILL DZIERSON',15);txt(d,(890,33),ACTS[s['act']].upper(),13,MUTED)
 if kind=='title':
  txt(d,(62,165),s['company'].upper(),16,ACCENT)
  txt(d,(58,232),s['title'],76,spacing=3)
  txt(d,(62,452),s['line'],23,MUTED)
 elif kind=='photo':
  txt(d,(48,465),s['company'].upper(),16,ACCENT)
  txt(d,(44,506),s['title'],62)
  txt(d,(48,587),s['line'],22)
 else:
  txt(d,(44,141),wrap(s['company'].upper(),14,390),14,ACCENT)
  txt(d,(41,222),s['title'],44,spacing=4)
  txt(d,(44,479),wrap(s['line'],20,370),20,MUTED,spacing=8)
 d.line((46,659,1234,659),fill='#78846a',width=1)
 txt(d,(46,680),s['year'],13,MUTED);txt(d,(986,680),'CONCEIVE / DESIGN / BUILD',12,MUTED)
 # Three quiet progress segments ground the film in its narrative chapters.
 for a in range(3):d.line((540+a*68,686,587+a*68,686),fill=ACCENT if a==s['act'] else '#63715b',width=2)
 overlay.save(BUILD/f'type-{i}.png')
 return bg,overlay

for i,s in enumerate(SCENES):
 bg,overlay=artwork(s,i);duration=s['duration']
 cmd=['ffmpeg','-y','-loglevel','error','-loop','1','-i',str(BUILD/f'art-{i}.jpg'),'-loop','1','-i',str(BUILD/f'type-{i}.png')]
 base=f"[0:v]scale=1600:900,zoompan=z='1+0.00015*on':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d={duration*FPS}:s=1280x720:fps=24[bg];"
 if s['kind'] in ('video','phone'):
  cmd+=['-ss',str(s['offset']),'-i',str(SRC/s['file'])]
  width,height=(760,460) if s['kind']=='video' else (300,505)
  x,y=(496,125) if s['kind']=='video' else (726,106)
  base+=f'[2:v]setpts=PTS-STARTPTS,scale={width}:{height}:force_original_aspect_ratio=decrease,setsar=1,fps=24[clip];[bg][clip]overlay={x}:{y}:shortest=1[media];'
 else:base+='[bg]null[media];'
 # The typography arrives after the image, and stays fixed while the camera moves.
 base+=f'[1:v]format=rgba,fade=t=in:st=0.12:d=0.45:alpha=1[type];[media][type]overlay=0:0:shortest=1,fade=t=in:st=0:d=0.28,fade=t=out:st={duration-.3}:d=0.3,format=yuv420p[v]'
 cmd+=['-filter_complex',base,'-map','[v]','-an','-t',str(duration),'-c:v','libx264','-preset','fast','-crf','21','-threads','4',str(BUILD/f'scene-{i}.mp4')]
 subprocess.run(cmd,check=True);print(f'Rendered {i+1}/{len(SCENES)}: {s["company"]}',flush=True)

# A restrained original score: warm sustained intervals, soft upper harmonics,
# and an accelerating sense of motion as the story turns toward building.
duration=sum(s['duration'] for s in SCENES);rate=32000
chords=[(110,164.8138,220,277.1826),(130.8128,195.9977,261.6256,329.6276),(97.9989,146.8324,195.9977,246.9417),(110,164.8138,220,293.6648)]
samples=array.array('h')
for n in range(duration*rate):
 t=n/rate;ch=int(t//8)%4;phase=t%8;blend=min(1,phase/2.5);blend=blend*blend*(3-2*blend)
 val=0
 for k,f in enumerate(chords[ch]):
  prev=chords[(ch-1)%4][k]
  mod=.85+.15*math.sin(t*.29+k)
  def tone(hz):return math.sin(2*math.pi*hz*t)+.16*math.sin(2*math.pi*hz*2.003*t)+.06*math.sin(2*math.pi*hz*3*t)
  val+=(blend*tone(f)+(1-blend)*tone(prev))*.023*mod
 # A breath-like pulse rather than percussion; no sampled/third-party music.
 pulse=(.5+.5*math.sin(2*math.pi*t/2))**5
 val+=.009*math.sin(2*math.pi*440*t)*pulse*min(1,max(0,(t-32)/12))
 env=min(1,t/3,(duration-t)/5)
 samples.append(int(max(-1,min(1,val*max(0,env)))*32767))
with wave.open(str(BUILD/'score.wav'),'wb') as wav:wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(rate);wav.writeframes(samples.tobytes())
(BUILD/'concat.txt').write_text('\n'.join(f"file '{BUILD/f'scene-{i}.mp4'}'" for i in range(len(SCENES))))
subprocess.run(['ffmpeg','-y','-loglevel','error','-f','concat','-safe','0','-i',str(BUILD/'concat.txt'),'-i',str(BUILD/'score.wav'),'-map','0:v:0','-map','1:a:0','-c:v','copy','-c:a','aac','-b:a','128k','-af','loudnorm=I=-22:TP=-2:LRA=7','-shortest','-movflags','+faststart',str(BUILD/'career-reel.mp4')],check=True)
(BUILD/'career-reel.mp4').replace(OUT/'career-reel.mp4')

# Poster: an editorial cover, with three periods of the work sharing one frame.
poster=BG.copy();d=ImageDraw.Draw(poster)
for file,box in [('7b4a9961-a088-46f4-bc88-8f0d64589227.png',(700,-70,1040,270)),('a29df936-41db-4244-b968-203b71235c76-0.png',(570,300,1190,690)),('d8307ba2-cc0e-4fc5-bc00-48fd5458dd08-9.png',(870,45,1530,395))]:
 im=Image.open(SRC/file).convert('RGB');im=ImageOps.fit(im,(box[2]-box[0],box[3]-box[1]),Image.Resampling.LANCZOS);poster.paste(im,box[:2])
shade=Image.new('RGBA',(W,H));sd=ImageDraw.Draw(shade)
for x in range(W):sd.line((x,0,x,H),fill=(19,31,27,int(200*max(0,1-x/950))))
poster=Image.alpha_composite(poster.convert('RGBA'),shade).convert('RGB');d=ImageDraw.Draw(poster)
txt(d,(46,40),'WILL DZIERSON / A CAREER IN THREE ACTS',13,MUTED)
txt(d,(42,155),'The work is\nmaking it\nuseful.',84,spacing=0)
poster.save(OUT/'poster.webp',quality=91)
manifest=[];start=0
for s in SCENES:
 manifest.append({**{k:v for k,v in s.items() if k not in ['color','offset']},'start':start});start+=s['duration']
(OUT/'chapters.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
(OUT/'transcript.txt').write_text('THE WORK IS MAKING IT USEFUL\nA career in three acts — Will Dzierson\n\n'+ '\n\n'.join(f'{s["start"]:02d}s · {s["company"]} ({s["year"]})\n{s["title"].replace(chr(10)," ")} {s["line"]}' for s in manifest)+'\n\nOriginal instrumental score. No voiceover.\nSource: published portfolio project media and Will’s executive résumé.\nNoodle operated 2023–2025 and has since dissolved.\n')
print(f'Complete: {duration}s with original score',flush=True)
