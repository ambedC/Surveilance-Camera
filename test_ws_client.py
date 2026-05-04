import asyncio
import websockets

async def main():
    uri = "ws://127.0.0.1:8000/ws/webcam"
    try:
        async with websockets.connect(uri) as ws:
            print('Connected to', uri)
            for i in range(10):
                msg = await ws.recv()
                print('msg:', type(msg), len(msg) if isinstance(msg, str) else 'bytes')
    except Exception as e:
        print('Error connecting or receiving:', e)

if __name__ == '__main__':
    asyncio.run(main())
