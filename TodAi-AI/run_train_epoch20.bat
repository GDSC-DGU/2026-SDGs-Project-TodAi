@echo off
cd /d d:\donghyun\sgds

echo [1/3] Copying epoch10 final checkpoint to epoch20 output dir... >> train_epoch20.log 2>&1
xcopy /E /I /Y outputs\whisper-dialect-epoch10\checkpoint-444130 outputs\whisper-dialect-epoch20\checkpoint-444130 >> train_epoch20.log 2>&1
if errorlevel 1 (
    echo ERROR: checkpoint copy failed >> train_epoch20.log 2>&1
    exit /b 1
)
echo Checkpoint copy done. >> train_epoch20.log 2>&1

echo [2/3] Starting training epoch11~20 (resume from checkpoint-444130)... >> train_epoch20.log 2>&1
d:\donghyun\sgds\venv\Scripts\python.exe stt_model/whisper_dialect_finetune.py train ^
  --train_files data/processed/manifests/train.jsonl ^
  --eval_files data/processed/manifests/val_small.jsonl ^
  --output_dir outputs/whisper-dialect-epoch20 ^
  --per_device_train_batch_size 8 ^
  --gradient_accumulation_steps 4 ^
  --learning_rate 1e-3 ^
  --num_train_epochs 20 ^
  --save_strategy epoch ^
  --eval_strategy epoch ^
  --save_total_limit 20 ^
  --logging_steps 50 ^
  --no_save_merged ^
  --resume >> train_epoch20.log 2>&1

if errorlevel 1 (
    echo ERROR: training failed >> train_epoch20.log 2>&1
    exit /b 1
)

echo [3/3] Merging LoRA adapter for each epoch checkpoint... >> train_epoch20.log 2>&1
d:\donghyun\sgds\venv\Scripts\python.exe stt_model/merge_epochs.py ^
  --output_root outputs/whisper-dialect-epoch20 >> train_epoch20.log 2>&1

echo DONE >> train_epoch20.log 2>&1
