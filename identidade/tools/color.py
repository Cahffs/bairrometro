"""Conversões de cor usadas pela identidade visual (só biblioteca padrão).

- sRGB <-> OKLab/OKLCH: espaço de cor perceptual (Ottosson, 2020). Passos iguais
  de L parecem passos iguais de claridade, o que torna as escalas de dados honestas.
- Contraste WCAG 2.1: razão entre as luminâncias relativas de duas cores.
"""
import math


def _to_linear(channel):
    # remove a curva gama do sRGB (valor de 0 a 255 -> luz linear de 0 a 1)
    c = channel / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _to_gamma(c):
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def hex_to_rgb(hex_color):
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rgb_to_hex(rgb):
    return "#" + "".join(f"{max(0, min(255, round(v))):02X}" for v in rgb)


def hex_to_oklab(hex_color):
    r, g, b = (_to_linear(v) for v in hex_to_rgb(hex_color))
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l, m, s = (math.copysign(abs(v) ** (1 / 3), v) for v in (l, m, s))
    return (
        0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
    )


def _oklab_to_linear_rgb(L, a, b):
    l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3
    m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3
    s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3
    return (
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
    )


def hex_to_oklch(hex_color):
    L, a, b = hex_to_oklab(hex_color)
    return L, math.hypot(a, b), math.degrees(math.atan2(b, a)) % 360


def oklch_to_hex(L, C, H):
    """OKLCH -> hex. Se a cor não existe em sRGB, reduz o croma até caber."""
    while True:
        a = C * math.cos(math.radians(H))
        b = C * math.sin(math.radians(H))
        rgb = _oklab_to_linear_rgb(L, a, b)
        if all(-1e-6 <= v <= 1 + 1e-6 for v in rgb) or C <= 0:
            return rgb_to_hex([_to_gamma(min(max(v, 0), 1)) * 255 for v in rgb])
        C -= 0.002


def relative_luminance(hex_color):
    r, g, b = (_to_linear(v) for v in hex_to_rgb(hex_color))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast_ratio(color_a, color_b):
    """Contraste WCAG: 4,5 é o mínimo para texto comum; 3 para gráficos e texto grande."""
    high, low = sorted((relative_luminance(color_a), relative_luminance(color_b)), reverse=True)
    return (high + 0.05) / (low + 0.05)
