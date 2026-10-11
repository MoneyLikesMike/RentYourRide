import sys
from PIL import Image, ImageDraw, ImageFont
def make(pre, word, post, out, S=2, track=1.6):
    W,H=636*S,47*S
    BG=(222,242,241,255); TXT=(23,82,90,255); HL=(251,175,93,255)
    font=ImageFont.truetype('/tmp/hb/LilitaOne.ttf',34*S)
    def w(t): return sum(font.getlength(c) for c in t)+track*S*len(t)
    total=w(pre)+w(word)+w(post)
    pad=40*S
    canvas=Image.new('RGBA',(W+2*pad,H),BG); d=ImageDraw.Draw(canvas)
    asc,_=font.getmetrics(); y=(H-asc)/2 - 1*S
    x=(W+2*pad-total)/2; xw=x+w(pre)
    d.rectangle([xw-2*S, y+asc*0.52, xw+w(word)+2*S, H-3*S], fill=HL)
    for c in pre+word+post:
        d.text((x,y),c,font=font,fill=TXT); x+=font.getlength(c)+track*S
    sh=0.18
    img=canvas.transform(canvas.size, Image.AFFINE,(1,sh,-sh*H/2,0,1,0),resample=Image.BICUBIC,fillcolor=BG).crop((pad,0,pad+W,H))
    img.convert('RGB').save(out, optimize=True)
make('You Got A ','Review','!','/tmp/hb/review-heading.png')
