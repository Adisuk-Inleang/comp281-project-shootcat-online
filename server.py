# Using eventlet for asynchronous operations
import eventlet
eventlet.monkey_patch()

from flask import Flask, render_template, request
from flask_socketio import SocketIO
import uuid
import math

# Global state for players and projectiles
players = {}
projectiles = [] 

# Game canvas dimensions
canvasWidth = 1450
canvasHeight = 600

# Flask and SocketIO setup
app = Flask(__name__)
socketio = SocketIO(app, async_mode='eventlet', cors_allowed_origins='*')

# Game loop background task
is_start_game_update = False
def game_update():
    global projectiles
    
    TICK_RATE = 1.0 / 60.0
    PLAYER_MOVE_SPEED = 200 * TICK_RATE
    PROJECTILE_SPEED = 450 * TICK_RATE
    PLAYER_HITBOX_RADIUS = 35
    PROJECTILE_HITBOX_RADIUS = 5

    while True:
        socketio.sleep(TICK_RATE)

        # Update player positions
        _players = []
        for sid, player in players.copy().items():
            if player['direction'] == 'up' and player['pos']['y'] > 0:
                player['pos']['y'] -= PLAYER_MOVE_SPEED
            elif player['direction'] == 'down' and player['pos']['y'] < canvasHeight:
                player['pos']['y'] += PLAYER_MOVE_SPEED
            elif player['direction'] == 'left' and player['pos']['x'] > 0:
                player['pos']['x'] -= PLAYER_MOVE_SPEED
            elif player['direction'] == 'right' and player['pos']['x'] < canvasWidth:
                player['pos']['x'] += PLAYER_MOVE_SPEED
            _players.append(player)

        # Update projectile positions and check for collisions
        projectiles_to_remove = set()
        for proj in projectiles[:]:
            proj['pos']['x'] += proj['velocity']['x']
            proj['pos']['y'] += proj['velocity']['y']

            if not (0 < proj['pos']['x'] < canvasWidth and 0 < proj['pos']['y'] < canvasHeight):
                projectiles_to_remove.add(proj['id'])
                continue

            for sid, player in players.copy().items():
                if proj['owner_sid'] == sid:
                    continue

                distance = math.hypot(proj['pos']['x'] - player['pos']['x'], proj['pos']['y'] - player['pos']['y'])
                if distance < PLAYER_HITBOX_RADIUS + PROJECTILE_HITBOX_RADIUS:
                    player['health'] = max(0, player['health'] - proj['damage'])
                    # print(f"HIT! Player {player['name']} health: {player['health']}")
                    projectiles_to_remove.add(proj['id'])
                    break
        
        if projectiles_to_remove:
            projectiles = [p for p in projectiles if p['id'] not in projectiles_to_remove]
        
        # Broadcast game state to all clients
        socketio.emit('game_update', {'players': _players})
        socketio.emit('projectiles_update', {'projectiles': projectiles})

# ===== SocketIO Event Handlers =====
@socketio.on('connect')
def handle_connect():
    print('Client connected', request.sid)
    global is_start_game_update
    if not is_start_game_update:
        is_start_game_update = True
        socketio.start_background_task(game_update)

@socketio.on('disconnect')
def handle_disconnect():
    players.pop(request.sid, None)
    print('Client disconnected', request.sid)

@socketio.on('join_game')
def handle_join_game(data):
    players[request.sid] = {
        'name': data['name'], 'color': data['color'], 'shape': data['shape'],
        'pos': {'x': int(data['pos']['x']), 'y': int(data['pos']['y'])},
        'direction': 'stop', 'health': 100, 'sid': request.sid
    }
    print(f"Player joined: {players[request.sid]['name']}")

@socketio.on('move')
def handle_move(data):
    if request.sid in players:
        players[request.sid]['direction'] = data['direction']

# ===== MODIFIED: Added debug print statements =====
@socketio.on('attack')
def handle_attack(data):
    print("\n--- Attack event received! ---")

    if request.sid not in players:
        print(f"DEBUG: Attacker with SID {request.sid} not found in players list.")
        return

    print(f"DEBUG: Attacker found: {players[request.sid]['name']}")
    print(f"DEBUG: Received data payload: {data}")

    if 'targetX' not in data or 'targetY' not in data:
        print("DEBUG: ERROR - 'targetX' or 'targetY' not found in data.")
        return

    attacker = players[request.sid]
    
    # Vector calculation
    dx = data['targetX'] - attacker['pos']['x']
    dy = data['targetY'] - attacker['pos']['y']
    distance = math.hypot(dx, dy)

    if distance == 0: 
        print("DEBUG: Attack ignored, distance is 0 (clicked on self).")
        return

    # Normalize vector and apply speed
    projectile_speed = 450 * (1.0 / 60.0)
    velocity_x = (dx / distance) * projectile_speed
    velocity_y = (dy / distance) * projectile_speed
    
    # Create a new projectile
    new_projectile = {
        'id': str(uuid.uuid4()), 'owner_sid': request.sid,
        'pos': attacker['pos'].copy(),
        'velocity': {'x': velocity_x, 'y': velocity_y},
        'damage': 5
    }
    projectiles.append(new_projectile)
    print(f"DEBUG: New projectile created. Total projectiles in list: {len(projectiles)}")


# ===== Flask Route =====
@app.route('/')
def index():
    return render_template('index.html')

# ===== Main Entry Point =====
if __name__ == '__main__':
    socketio.run(app, host="0.0.0.0", debug=True, port=5000)
