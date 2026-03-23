import traceback

try:
    import backend.main
    print('Imported backend.main successfully')
except Exception:
    traceback.print_exc()
