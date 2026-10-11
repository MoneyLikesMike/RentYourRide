import os
from PIL import Image, ImageDraw, ImageFont

FONT = os.path.expanduser('~/Library/Fonts/CarterOne-Regular.ttf')
OUT_DIR = os.path.join(os.path.dirname(__file__), '../../web/public/email')


def make(pre, word, post, out, S=2, size=30, track=1.9):
    W, H = 636 * S, 47 * S
    BG = (222, 242, 241); TXT = (14, 72, 79); HL = (255, 167, 91)
    font = ImageFont.truetype(FONT, size * S)
    def w(t): return sum(font.getlength(c) + track * S for c in t)
    img = Image.new('RGB', (W, H), BG); d = ImageDraw.Draw(img)
    top, bottom = font.getbbox('R')[1], font.getbbox('R')[3]
    y = (H - (bottom - top)) / 2 - top
    x = (W - w(pre + word + post)) / 2; xw = x + w(pre)
    d.rectangle([xw - 2 * S, y + top + (bottom - top) * 0.5, xw + w(word) - track * S + 2 * S, y + bottom + 4 * S], fill=HL)
    for c in pre + word + post:
        d.text((x, y), c, font=font, fill=TXT); x += font.getlength(c) + track * S
    img.save(out, optimize=True)


make('You Got A ', 'Review', '!', os.path.join(OUT_DIR, 'review-heading.png'))
