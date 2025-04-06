import pygame
import sys
import random
import math

# --- Khởi tạo Pygame ---
pygame.init()

# --- Hằng số ---
SCREEN_WIDTH = 1000
SCREEN_HEIGHT = 700
PLAYER_SIZE = 40
PLAYER_SPEED = 5
PLAYER_HEALTH = 100
ENEMY_SIZE = 30
ENEMY_SPEED_MIN = 1
ENEMY_SPEED_MAX = 3
ENEMY_HEALTH = 3
BULLET_SIZE = 8
BULLET_SPEED = 10
TREE_WIDTH = 30
TREE_HEIGHT = 60
ROCK_WIDTH = 40
ROCK_HEIGHT = 30
OBSTACLE_COUNT = 20
ENEMY_SPAWN_RATE = 2000 # milliseconds

# --- Màu sắc ---
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLUE = (0, 0, 255)
YELLOW = (255, 255, 0)
PLAYER_COLOR = (52, 152, 219) # #3498db
PLAYER_CENTER_COLOR = (41, 128, 185) # #2980b9
ENEMY_COLOR = (231, 76, 60) # #e74c3c
BULLET_COLOR = (241, 196, 15) # #f1c40f
TREE_COLOR = (39, 174, 96) # #27ae60
ROCK_COLOR = (127, 140, 141) # #7f8c8d
BACKGROUND_COLOR = (74, 117, 44) # #4a752c
HUD_BG_COLOR = (0, 0, 0, 128) # Transparent black
HEALTH_BAR_BG = (85, 85, 85) # #555
HEALTH_HIGH = (46, 204, 113) # #2ecc71
HEALTH_MEDIUM = (243, 156, 18) # #f39c12
HEALTH_LOW = (231, 76, 60) # #e74c3c
CROSSHAIR_COLOR = WHITE

# --- Cài đặt màn hình ---
screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
pygame.display.set_caption("Mini PUBG")
clock = pygame.time.Clock()
font = pygame.font.Font(None, 36) # Font cho HUD
large_font = pygame.font.Font(None, 72) # Font cho Game Over/Start
small_font = pygame.font.Font(None, 28) # Font cho hướng dẫn

# --- Lớp Sprite ---

class Player(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        self.image_orig = pygame.Surface((PLAYER_SIZE, PLAYER_SIZE), pygame.SRCALPHA)
        pygame.draw.circle(self.image_orig, PLAYER_COLOR, (PLAYER_SIZE // 2, PLAYER_SIZE // 2), PLAYER_SIZE // 2)
        pygame.draw.circle(self.image_orig, PLAYER_CENTER_COLOR, (PLAYER_SIZE // 2, PLAYER_SIZE // 2), PLAYER_SIZE // 4)
        self.image = self.image_orig.copy()
        self.rect = self.image.get_rect(center=(SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2))
        self.pos = pygame.math.Vector2(self.rect.center)
        self.speed = PLAYER_SPEED
        self.health = PLAYER_HEALTH
        self.vel = pygame.math.Vector2(0, 0)

    def update(self, obstacles):
        self.get_input()

        new_pos = self.pos + self.vel
        new_rect = self.rect.copy()
        new_rect.center = new_pos

        # Kiểm tra va chạm với biên màn hình
        if new_rect.left < 0:
            new_pos.x = self.rect.width / 2
        if new_rect.right > SCREEN_WIDTH:
            new_pos.x = SCREEN_WIDTH - self.rect.width / 2
        if new_rect.top < 0:
            new_pos.y = self.rect.height / 2
        if new_rect.bottom > SCREEN_HEIGHT:
            new_pos.y = SCREEN_HEIGHT - self.rect.height / 2

        # Kiểm tra va chạm với chướng ngại vật (theo từng trục)
        new_rect.centerx = new_pos.x # Di chuyển theo X trước
        for obstacle in obstacles:
             if new_rect.colliderect(obstacle.rect):
                 if self.vel.x > 0: # Đang đi sang phải
                     new_pos.x = obstacle.rect.left - self.rect.width / 2
                 elif self.vel.x < 0: # Đang đi sang trái
                     new_pos.x = obstacle.rect.right + self.rect.width / 2
                 new_rect.centerx = new_pos.x # Cập nhật lại rect để kiểm tra Y
                 break # Chỉ xử lý va chạm với một vật cản mỗi lần

        new_rect.centery = new_pos.y # Di chuyển theo Y
        for obstacle in obstacles:
             if new_rect.colliderect(obstacle.rect):
                 if self.vel.y > 0: # Đang đi xuống
                     new_pos.y = obstacle.rect.top - self.rect.height / 2
                 elif self.vel.y < 0: # Đang đi lên
                     new_pos.y = obstacle.rect.bottom + self.rect.height / 2
                 new_rect.centery = new_pos.y # Cập nhật lại rect
                 break # Chỉ xử lý va chạm với một vật cản mỗi lần

        self.pos = new_pos
        self.rect.center = self.pos

    def get_input(self):
        keys = pygame.key.get_pressed()
        self.vel = pygame.math.Vector2(0, 0)
        if keys[pygame.K_w]:
            self.vel.y = -self.speed
        if keys[pygame.K_s]:
            self.vel.y = self.speed
        if keys[pygame.K_a]:
            self.vel.x = -self.speed
        if keys[pygame.K_d]:
            self.vel.x = self.speed

        # Chuẩn hóa vector vận tốc để di chuyển chéo không nhanh hơn
        if self.vel.length() > 0:
            self.vel = self.vel.normalize() * self.speed

    def take_damage(self, amount):
        self.health -= amount
        if self.health < 0:
            self.health = 0
        # Có thể thêm hiệu ứng nhấp nháy khi bị thương ở đây

    def shoot(self, target_pos):
        direction = pygame.math.Vector2(target_pos) - self.pos
        if direction.length() > 0:
            direction = direction.normalize()
        bullet = Bullet(self.pos, direction)
        all_sprites.add(bullet)
        bullets.add(bullet)

class Enemy(pygame.sprite.Sprite):
    def __init__(self, player_pos):
        super().__init__()
        self.image = pygame.Surface((ENEMY_SIZE, ENEMY_SIZE), pygame.SRCALPHA)
        pygame.draw.circle(self.image, ENEMY_COLOR, (ENEMY_SIZE // 2, ENEMY_SIZE // 2), ENEMY_SIZE // 2)
        self.rect = self.image.get_rect()
        self.speed = random.uniform(ENEMY_SPEED_MIN, ENEMY_SPEED_MAX)
        self.health = ENEMY_HEALTH

        # Sinh ra ở rìa màn hình
        edge = random.choice(['top', 'bottom', 'left', 'right'])
        if edge == 'top':
            self.rect.centerx = random.randint(0, SCREEN_WIDTH)
            self.rect.bottom = 0
        elif edge == 'bottom':
            self.rect.centerx = random.randint(0, SCREEN_WIDTH)
            self.rect.top = SCREEN_HEIGHT
        elif edge == 'left':
            self.rect.centery = random.randint(0, SCREEN_HEIGHT)
            self.rect.right = 0
        elif edge == 'right':
            self.rect.centery = random.randint(0, SCREEN_HEIGHT)
            self.rect.left = SCREEN_WIDTH
        self.pos = pygame.math.Vector2(self.rect.center)

    def update(self, player_pos):
        direction = player_pos - self.pos
        if direction.length() > 0:
            direction = direction.normalize()
        self.pos += direction * self.speed
        self.rect.center = self.pos

    def take_damage(self, amount):
        self.health -= amount
        if self.health <= 0:
            self.kill() # Xóa sprite khỏi tất cả các group
            return True # Trả về True nếu bị tiêu diệt
        return False

class Bullet(pygame.sprite.Sprite):
    def __init__(self, start_pos, direction):
        super().__init__()
        self.image = pygame.Surface((BULLET_SIZE, BULLET_SIZE), pygame.SRCALPHA)
        pygame.draw.circle(self.image, BULLET_COLOR, (BULLET_SIZE // 2, BULLET_SIZE // 2), BULLET_SIZE // 2)
        self.rect = self.image.get_rect(center=start_pos)
        self.pos = pygame.math.Vector2(start_pos)
        self.direction = direction
        self.speed = BULLET_SPEED

    def update(self):
        self.pos += self.direction * self.speed
        self.rect.center = self.pos
        # Xóa đạn nếu ra khỏi màn hình
        if not screen.get_rect().colliderect(self.rect):
            self.kill()

class Obstacle(pygame.sprite.Sprite):
    def __init__(self, x, y, type):
        super().__init__()
        if type == 'tree':
            self.image = pygame.Surface((TREE_WIDTH, TREE_HEIGHT))
            self.image.fill(TREE_COLOR)
        else: # Rock
            self.image = pygame.Surface((ROCK_WIDTH, ROCK_HEIGHT))
            self.image.fill(ROCK_COLOR)
        self.rect = self.image.get_rect(topleft=(x, y))
        self.type = type

# --- Hàm Helper ---
def draw_text(surface, text, font, color, position, anchor="center"):
    text_surface = font.render(text, True, color)
    text_rect = text_surface.get_rect()
    if anchor == "center":
        text_rect.center = position
    elif anchor == "topleft":
        text_rect.topleft = position
    elif anchor == "midtop":
        text_rect.midtop = position
    # Thêm các anchor khác nếu cần
    surface.blit(text_surface, text_rect)

def draw_health_bar(surface, x, y, width, height, current_health, max_health):
    if current_health < 0: current_health = 0
    fill_pct = current_health / max_health
    fill_width = int(width * fill_pct)

    # Xác định màu dựa trên phần trăm máu
    if fill_pct > 0.7:
        fill_color = HEALTH_HIGH
    elif fill_pct > 0.3:
        fill_color = HEALTH_MEDIUM
    else:
        fill_color = HEALTH_LOW

    background_rect = pygame.Rect(x, y, width, height)
    fill_rect = pygame.Rect(x, y, fill_width, height)

    pygame.draw.rect(surface, HEALTH_BAR_BG, background_rect, border_radius=5)
    pygame.draw.rect(surface, fill_color, fill_rect, border_radius=5)

def draw_crosshair(surface, pos):
    pygame.draw.line(surface, CROSSHAIR_COLOR, (pos[0] - 15, pos[1]), (pos[0] + 15, pos[1]), 2)
    pygame.draw.line(surface, CROSSHAIR_COLOR, (pos[0], pos[1] - 15), (pos[0], pos[1] + 15), 2)

def create_obstacles(player_rect):
    obstacles_group = pygame.sprite.Group()
    for _ in range(OBSTACLE_COUNT):
        valid_position = False
        while not valid_position:
            o_type = random.choice(['tree', 'rock'])
            o_width = TREE_WIDTH if o_type == 'tree' else ROCK_WIDTH
            o_height = TREE_HEIGHT if o_type == 'tree' else ROCK_HEIGHT
            x = random.randint(0, SCREEN_WIDTH - o_width)
            y = random.randint(0, SCREEN_HEIGHT - o_height)
            temp_rect = pygame.Rect(x, y, o_width, o_height)

            # Đảm bảo không sinh ra quá gần người chơi ban đầu
            if not temp_rect.colliderect(player_rect.inflate(100, 100)): # Tạo vùng cấm xung quanh player
                 # Đảm bảo không chồng chéo lên vật cản khác (đơn giản)
                overlap = False
                for obs in obstacles_group:
                    if temp_rect.colliderect(obs.rect.inflate(10,10)): # Thêm khoảng đệm nhỏ
                        overlap = True
                        break
                if not overlap:
                    valid_position = True

        obstacle = Obstacle(x, y, o_type)
        obstacles_group.add(obstacle)
    return obstacles_group

def show_start_screen():
    screen.fill(BACKGROUND_COLOR) # Hoặc màu đen
    draw_text(screen, "MINI PUBG", large_font, WHITE, (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 4))
    draw_text(screen, "Use WASD to move", small_font, WHITE, (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2 - 30))
    draw_text(screen, "Mouse to aim, Click to shoot", small_font, WHITE, (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2))
    draw_text(screen, "Press SPACE to Start", font, YELLOW, (SCREEN_WIDTH // 2, SCREEN_HEIGHT * 3 // 4))
    pygame.display.flip()
    waiting = True
    while waiting:
        clock.tick(60)
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE:
                    waiting = False

def show_game_over_screen(score):
    overlay = pygame.Surface((SCREEN_WIDTH, SCREEN_HEIGHT), pygame.SRCALPHA)
    overlay.fill((0, 0, 0, 180)) # Màu đen bán trong suốt
    screen.blit(overlay, (0, 0))

    draw_text(screen, "Game Over", large_font, RED, (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 4))
    draw_text(screen, f"Your score: {score}", font, WHITE, (SCREEN_WIDTH // 2, SCREEN_HEIGHT // 2))
    draw_text(screen, "Press SPACE to Play Again", font, YELLOW, (SCREEN_WIDTH // 2, SCREEN_HEIGHT * 3 // 4))
    pygame.display.flip()
    waiting = True
    while waiting:
        clock.tick(60)
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                pygame.quit()
                sys.exit()
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_SPACE:
                    waiting = False
                    return True # Báo hiệu muốn chơi lại
    return False # Nếu đóng cửa sổ

# --- Thiết lập Game ---
game_state = "START" # Trạng thái ban đầu
running = True
while running:

    if game_state == "START":
        show_start_screen()
        game_state = "PLAYING"

        # --- Khởi tạo lại các đối tượng game ---
        all_sprites = pygame.sprite.Group()
        enemies = pygame.sprite.Group()
        bullets = pygame.sprite.Group()

        player = Player()
        all_sprites.add(player)

        obstacles = create_obstacles(player.rect)
        all_sprites.add(obstacles) # Thêm vật cản vào all_sprites để vẽ

        kills = 0

        # Timer để sinh Enemy
        ADDENEMY = pygame.USEREVENT + 1
        pygame.time.set_timer(ADDENEMY, ENEMY_SPAWN_RATE)

    elif game_state == "PLAYING":
        # --- Xử lý Input (Events) ---
        mouse_pos = pygame.mouse.get_pos()
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            if event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE: # Thoát nhanh (tùy chọn)
                    running = False
            if event.type == pygame.MOUSEBUTTONDOWN:
                if event.button == 1: # Chuột trái
                   player.shoot(mouse_pos)
            if event.type == ADDENEMY:
                 if len(enemies) < 15: # Giới hạn số lượng enemy
                    new_enemy = Enemy(player.pos)
                    all_sprites.add(new_enemy)
                    enemies.add(new_enemy)

        # --- Update ---
        all_sprites.update(obstacles) # Player cần list obstacles để check va chạm
        enemies.update(player.pos)    # Enemies cần vị trí player để di chuyển tới
        bullets.update()              # Bullets tự update

        # --- Kiểm tra va chạm ---
        # Đạn bắn trúng Enemy
        # True, False: Xóa đạn, không xóa enemy (vì cần check máu)
        hits = pygame.sprite.groupcollide(bullets, enemies, True, False)
        for bullet, enemy_list in hits.items():
            for enemy in enemy_list:
                 if enemy.take_damage(1): # Nếu enemy bị tiêu diệt
                     kills += 1

        # Enemy va chạm Player
        player_hits = pygame.sprite.spritecollide(player, enemies, True) # True: Xóa enemy khi va chạm
        for hit_enemy in player_hits:
            player.take_damage(10) # Giảm máu khi bị enemy chạm vào
            # Có thể thêm hiệu ứng âm thanh/hình ảnh ở đây
            if player.health <= 0:
                game_state = "GAME_OVER"

        # --- Vẽ / Render ---
        screen.fill(BACKGROUND_COLOR)
        all_sprites.draw(screen) # Vẽ tất cả sprite (player, enemies, bullets, obstacles)

        # Vẽ HUD
        hud_surface = pygame.Surface((240, 100), pygame.SRCALPHA) # Tạo surface trong suốt cho HUD
        hud_surface.fill(HUD_BG_COLOR)
        draw_text(hud_surface, f"Kills: {kills}", font, WHITE, (10, 10), anchor="topleft")
        draw_text(hud_surface, "Health:", font, WHITE, (10, 45), anchor="topleft")
        draw_health_bar(hud_surface, 10, 75, 200, 20, player.health, PLAYER_HEALTH)
        screen.blit(hud_surface, (10, 10)) # Vẽ HUD lên màn hình chính

        # Vẽ Crosshair
        draw_crosshair(screen, mouse_pos)

        # --- Cập nhật màn hình ---
        pygame.display.flip()

        # --- Giới hạn FPS ---
        clock.tick(144) # 60 frames per second

    elif game_state == "GAME_OVER":
        play_again = show_game_over_screen(kills)
        if play_again:
            game_state = "START" # Quay lại màn hình bắt đầu để reset game
        else:
            running = False # Thoát nếu người dùng không muốn chơi lại

# --- Thoát Pygame ---
pygame.quit()
sys.exit()