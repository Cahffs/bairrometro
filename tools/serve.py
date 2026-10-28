"""Servidor local para desenvolver o site, sem cache: o navegador sempre pega a versão mais nova.

    python tools/serve.py site 8767

Igual ao `python -m http.server`, preso a 127.0.0.1 (não aparece na rede), mas manda o
cabeçalho `Cache-Control: no-store`. Só para desenvolvimento: no GitHub Pages o cache é outro.
"""

import functools
import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("uso: python tools/serve.py <pasta> <porta>   (ex.: site 8767)")
    directory, port = sys.argv[1], int(sys.argv[2])
    handler = functools.partial(NoCacheHandler, directory=directory)
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), handler) as server:
        print(f"servindo {directory}/ em http://localhost:{port} (sem cache)")
        server.serve_forever()


if __name__ == "__main__":
    main()
