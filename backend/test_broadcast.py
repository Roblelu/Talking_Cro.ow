import requests

def test_broadcast():
    print("Enviando evento de prueba a React...")
    res = requests.post("http://127.0.0.1:8763/api/internal/broadcast", json={
        "type": "comment",
        "username": "@PruebaGhost",
        "message": "Hola Vridel, esto es una prueba del sistema."
    })
    print("Respuesta:", res.status_code, res.text)

if __name__ == "__main__":
    test_broadcast()
