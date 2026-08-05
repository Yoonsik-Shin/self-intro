/**
 * 다음/카카오 도로명 주소 검색 API 및 도로명 주소 -> 위도/경도 자동 지오코딩 유틸리티
 */

export interface DaumPostcodeData {
    zonecode: string; // 우편번호
    address: string; // 기본 주소 (도로명 주소 또는 지번 주소)
    addressType: 'R' | 'J';
    bname: string; // 법정동명
    buildingName: string; // 건물명
    roadAddress: string; // 도로명 주소
    jibunAddress: string; // 지번 주소
    sido: string;
    sigungu: string;
}

declare global {
    interface Window {
        daum?: {
            Postcode: new (options: {
                oncomplete: (data: DaumPostcodeData) => void;
                q?: string; // 폼에 작성된 주소를 초기 검색어로 주입
                width?: string | number;
                height?: string | number;
                autoClose?: boolean;
            }) => {
                open: (options?: { q?: string }) => void;
                embed: (element: HTMLElement, options?: { q?: string }) => void;
            };
        };
    }
}

const DAUM_POSTCODE_SCRIPT_URL =
    'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

/**
 * 다음 우편번호 스크립트를 동적으로 로드합니다.
 */
export function loadDaumPostcodeScript(): Promise<void> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            reject(new Error('Window is not defined'));
            return;
        }

        if (window.daum && window.daum.Postcode) {
            resolve();
            return;
        }

        const existingScript = document.querySelector(`script[src="${DAUM_POSTCODE_SCRIPT_URL}"]`);
        if (existingScript) {
            existingScript.addEventListener('load', () => resolve());
            existingScript.addEventListener('error', (e) => reject(e));
            return;
        }

        const script = document.createElement('script');
        script.src = DAUM_POSTCODE_SCRIPT_URL;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
    });
}

/**
 * 작성된 주소를 초기 검색어(q)로 전달하여 주소 검색 팝업을 실행합니다.
 */
export async function openDaumPostcodeSearch(
    onSelectAddress: (data: DaumPostcodeData) => void,
    initialQuery?: string
): Promise<void> {
    await loadDaumPostcodeScript();
    if (window.daum && window.daum.Postcode) {
        new window.daum.Postcode({
            q: initialQuery && initialQuery.trim() ? initialQuery.trim() : undefined,
            oncomplete: (data: DaumPostcodeData) => {
                onSelectAddress(data);
            },
        }).open();
    } else {
        throw new Error('다음 우편번호 서비스를 불러오지 못했습니다.');
    }
}

/**
 * 작성된 주소를 초기 검색어(q)로 전달하여 지정된 HTML 컨테이너 내부에 카카오 주소 검색을 인라인 임베드합니다.
 */
export async function embedDaumPostcodeSearch(
    targetElement: HTMLElement,
    onSelectAddress: (data: DaumPostcodeData) => void,
    initialQuery?: string
): Promise<void> {
    await loadDaumPostcodeScript();
    if (window.daum && window.daum.Postcode) {
        targetElement.innerHTML = '';
        new window.daum.Postcode({
            q: initialQuery && initialQuery.trim() ? initialQuery.trim() : undefined,
            oncomplete: (data: DaumPostcodeData) => {
                onSelectAddress(data);
            },
            width: '100%',
            height: '100%',
        }).embed(targetElement);
    } else {
        throw new Error('다음 우편번호 서비스를 불러오지 못했습니다.');
    }
}

/**
 * 도로명 주소를 위도(latitude)와 경도(longitude) 좌표로 자동 산출합니다.
 * OpenStreetMap Nominatim 및 로컬 주요 키워드 파서 폴백 사용.
 */
export async function geocodeAddressClient(
    address: string
): Promise<{ lat: number; lng: number } | null> {
    if (!address || !address.trim()) return null;

    const sanitizedAddress = address
        .replace(/\([^)]*\)/g, '') // 괄호 참고항목 제거 (예: (서교동, 상록빌딩))
        .replace(/층.*/, '') // 층수 이하 제거
        .trim();

    try {
        // OpenStreetMap Nominatim Geocoding API (대한민국 주소 검색 지원)
        const encoded = encodeURIComponent(sanitizedAddress);
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&countrycodes=kr&limit=1`,
            {
                headers: {
                    'Accept-Language': 'ko',
                    'User-Agent': 'SelfIntroApp/1.0',
                },
            }
        );

        if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                const lat = parseFloat(data[0].lat);
                const lng = parseFloat(data[0].lon);
                if (!isNaN(lat) && !isNaN(lng)) {
                    return { lat, lng };
                }
            }
        }
    } catch (e) {
        console.warn('Geocoding fetch failed, trying keyword fallback:', e);
    }

    // 주소 키워드 지역 대략 좌표 폴백
    const loc = sanitizedAddress.toLowerCase();
    if (loc.includes('성북') || loc.includes('길음')) {
        return { lat: 37.6033, lng: 127.025 };
    } else if (loc.includes('마포') || loc.includes('상암') || loc.includes('서교')) {
        return { lat: 37.5508, lng: 126.9176 };
    } else if (loc.includes('강남') || loc.includes('역삼') || loc.includes('삼성')) {
        return { lat: 37.5006, lng: 127.0365 };
    } else if (loc.includes('판교') || loc.includes('분당') || loc.includes('성남')) {
        return { lat: 37.3948, lng: 127.1112 };
    } else if (loc.includes('여의도') || loc.includes('영등포')) {
        return { lat: 37.5255, lng: 126.9255 };
    } else if (loc.includes('성수') || loc.includes('성동')) {
        return { lat: 37.5447, lng: 127.056 };
    } else if (loc.includes('구로') || loc.includes('가산')) {
        return { lat: 37.4812, lng: 126.8827 };
    } else if (loc.includes('종로') || loc.includes('광화문')) {
        return { lat: 37.5704, lng: 126.9822 };
    } else if (loc.includes('송파') || loc.includes('잠실')) {
        return { lat: 37.5133, lng: 127.1001 };
    } else if (loc.includes('인천')) {
        return { lat: 37.4563, lng: 126.7052 };
    } else if (loc.includes('수원')) {
        return { lat: 37.2636, lng: 127.0286 };
    }

    return null;
}
