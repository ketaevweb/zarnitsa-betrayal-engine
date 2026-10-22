extends Node
## TimeSystem — игровые сутки, фазы дня и Мгла.
## 1 игровая минута = REAL_SECONDS_PER_GAME_MINUTE реальных секунд.
## Мгла (правила из GDD): полная с 22:00 до 05:00; подъём 19:00–22:00,
## спад 05:00–08:00. При интенсивности >= 0.5 Мгла считается активной.

signal minute_tick(day: int, hour: int, minute: int)
signal hour_changed(hour: int)
signal day_changed(day: int)
signal phase_changed(new_phase: String)
signal mist_changed(active: bool, intensity: float)

const REAL_SECONDS_PER_GAME_MINUTE: float = 0.25
const MINUTES_PER_DAY: int = 24 * 60

const PHASE_MORNING := "утро"
const PHASE_DAY := "день"
const PHASE_EVENING := "вечер"
const PHASE_NIGHT := "ночь"

const MIST_RAMP_EVENING_START: int = 19
const MIST_RAMP_MORNING_END: int = 8
const MIST_FULL_START: int = 22
const MIST_FULL_END: int = 5
const MIST_ACTIVE_THRESHOLD: float = 0.5

var running: bool = true
var time_scale: float = 1.0
var day: int = 1
var minutes_total: int = 8 * 60  # старт в 08:00

var _accum: float = 0.0
var _last_phase: String = ""
var _mist_active: bool = false
var _last_mist: float = -1.0


func _process(delta: float) -> void:
	if not running:
		return
	_accum += delta * time_scale
	while _accum >= REAL_SECONDS_PER_GAME_MINUTE:
		_accum -= REAL_SECONDS_PER_GAME_MINUTE
		advance_minutes(1)


## Продвинуть время на n игровых минут (детерминированно — удобно для тестов и скипов).
func advance_minutes(n: int) -> void:
	for i in n:
		minutes_total += 1
		if minutes_total >= MINUTES_PER_DAY:
			minutes_total = 0
			day += 1
			day_changed.emit(day)
		var h := get_hour()
		minute_tick.emit(day, h, get_minute())
		if minutes_total % 60 == 0:
			hour_changed.emit(h)
		_check_phase()
		_check_mist()


func get_hour() -> int:
	return int(minutes_total / 60.0)


func get_minute() -> int:
	return minutes_total - get_hour() * 60


func get_clock_text() -> String:
	return "%02d:%02d" % [get_hour(), get_minute()]


func get_phase() -> String:
	var h := get_hour()
	if h >= 5 and h < 11:
		return PHASE_MORNING
	if h >= 11 and h < 17:
		return PHASE_DAY
	if h >= 17 and h < 22:
		return PHASE_EVENING
	return PHASE_NIGHT


func mist_intensity() -> float:
	var h := get_hour()
	if h >= MIST_FULL_START or h < MIST_FULL_END:
		return 1.0
	if h >= MIST_RAMP_EVENING_START:
		return float(h - MIST_RAMP_EVENING_START) / 3.0
	if h < MIST_RAMP_MORNING_END:
		return float(MIST_RAMP_MORNING_END - h) / 3.0
	return 0.0


func is_mist_active() -> bool:
	return mist_intensity() >= MIST_ACTIVE_THRESHOLD


func set_time(h: int, m: int) -> void:
	minutes_total = clampi(h, 0, 23) * 60 + clampi(m, 0, 59)
	_check_phase()
	_check_mist()
	minute_tick.emit(day, get_hour(), get_minute())


func reset_to_new_game() -> void:
	day = 1
	minutes_total = 8 * 60
	_accum = 0.0
	_last_phase = ""
	_mist_active = false
	_last_mist = -1.0


func _check_phase() -> void:
	var ph := get_phase()
	if ph != _last_phase:
		_last_phase = ph
		phase_changed.emit(ph)


func _check_mist() -> void:
	var mi := mist_intensity()
	var act := mi >= MIST_ACTIVE_THRESHOLD
	if act != _mist_active or absf(mi - _last_mist) > 0.05:
		_mist_active = act
		_last_mist = mi
		mist_changed.emit(act, mi)
