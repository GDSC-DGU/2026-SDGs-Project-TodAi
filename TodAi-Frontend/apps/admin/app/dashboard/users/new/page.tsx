"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewUserPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [success, setSuccess] = useState<{ name: string; phone: string } | null>(null);

  const handleCancel = () => router.push("/dashboard/roster");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || "홍길동";
    const finalPhone = phone.trim() || "010-1111-2222";
    setSuccess({ name: finalName, phone: finalPhone });
  };
  const handleConfirmSuccess = () => {
    setSuccess(null);
    router.push("/dashboard/roster");
  };

  return (
    <div className="p-8 flex justify-center">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-sm p-10 mt-8 relative">
        <button
          onClick={handleCancel}
          className="absolute top-6 right-6 w-9 h-9 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50"
          aria-label="close"
        >
          ×
        </button>

        <h1 className="text-2xl font-bold text-blue-500 mb-2">사용자 등록</h1>
        <p className="text-sm text-gray-500 mb-8">
          이름과 전화번호를 입력하면 앱 안내 문자를 자동 발송합니다
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">이름</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="홍길동"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">전화번호</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3.5">
            <p className="text-sm font-semibold text-gray-800">
              등록 후 이 번호로 앱 설치 안내 문자가 자동 발송됩니다
            </p>
            <p className="text-xs text-gray-500 mt-1">
              [복지ON] 복지 서비스 앱이 등록되었습니다. 앱 설치: care.kr/app
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={handleCancel}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl py-3.5 text-sm font-semibold"
            >
              취소
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3.5 text-sm font-semibold"
            >
              등록하기
            </button>
          </div>

          <p className="text-xs text-gray-400 mt-4">
            * 등록된 번호는 어르신이 앱 로그인 시 인증 수단으로 사용됩니다
          </p>
        </form>
      </div>

      {success && (
        <RegisteredModal
          name={success.name}
          phone={success.phone}
          onClose={handleConfirmSuccess}
        />
      )}
    </div>
  );
}

function RegisteredModal({
  name,
  phone,
  onClose,
}: {
  name: string;
  phone: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50"
          aria-label="close"
        >
          ×
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
            <svg
              className="w-10 h-10 text-green-600"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900">등록이 완료되었습니다!</h2>
          <p className="text-sm text-gray-500 mt-2">{name}님 사용자 정보가 저장되었습니다</p>
        </div>

        <div className="bg-gray-50 rounded-xl px-5 py-4 mt-6">
          <p className="text-xs text-gray-400 mb-2">발송된 문자 내용</p>
          <p className="text-sm text-gray-800 leading-relaxed">
            [말벗 AI] {name}님,
            <br />
            말벗 서비스 앱이 등록되었습니다.
          </p>
          <p className="text-sm text-gray-800 leading-relaxed mt-3">
            📲 앱 설치: https://care.kr/app
            <br />
            문의: 담당 복지사 010-1234-5678
          </p>
        </div>

        <div className="bg-blue-50 rounded-xl px-5 py-3.5 mt-3">
          <p className="text-sm font-semibold text-blue-600">
            발송 번호: {phone} ({name})
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3.5 text-sm font-semibold"
        >
          확인
        </button>
      </div>
    </div>
  );
}
