"""학습한 wav2vec2 감정모델을 Hugging Face Hub에 업로드한다.

다른 환경(미들웨어 워커 등)에서는 repo_id 만으로 from_pretrained 가능 (자동 다운로드·캐시).

준비:
  1) https://huggingface.co 가입 → Settings > Access Tokens > New token (role: Write)
  2) 토큰 전달:  set HF_TOKEN=hf_xxxxx   (PowerShell: $env:HF_TOKEN="hf_xxxxx")
     또는 미리:  hf auth login

사용:
    python emotion_model/upload_to_hf.py <repo_id> [--public] [--model_dir 경로]
  예) python emotion_model/upload_to_hf.py HyukII/todai-emotion-wav2vec2
"""
import os, sys, argparse
from huggingface_hub import HfApi, login


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("repo_id", help="예: HyukII/todai-emotion-wav2vec2")
    ap.add_argument("--public", action="store_true", help="공개 repo로 생성 (기본 private)")
    ap.add_argument("--model_dir", default=os.environ.get("EMO_OUT_DIR", "outputs/wav2vec2") + "/best_model")
    args = ap.parse_args()

    if not os.path.isdir(args.model_dir):
        print(f"[오류] 모델 폴더 없음: {args.model_dir}")
        sys.exit(1)

    token = os.environ.get("HF_TOKEN")
    if token:
        login(token=token)

    api = HfApi()
    print(f"repo 생성/확인: {args.repo_id}  (private={not args.public})", flush=True)
    api.create_repo(repo_id=args.repo_id, repo_type="model",
                    private=not args.public, exist_ok=True)

    print("업로드 시작 (1.2GB, 회선에 따라 수 분 소요)...", flush=True)
    api.upload_folder(
        folder_path=args.model_dir,
        repo_id=args.repo_id,
        repo_type="model",
        commit_message="Upload todai Korean emotion wav2vec2 (6-class)",
    )
    print(f"\n완료  https://huggingface.co/{args.repo_id}")


if __name__ == "__main__":
    main()
