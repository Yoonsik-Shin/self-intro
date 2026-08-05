/**
 * 출발지(집)와 목적지(회사) 간의 거리 및 출퇴근 소요시간 추정 유틸리티
 */

export interface CommuteEstimate {
    straightDistanceKm: number; // 직선 거리 (km)
    estimatedDistanceKm: number; // 대중교통/도로 보정 거리 (km)
    estimatedMinutes: number; // 예상 소요시간 (분)
    formattedTimeText: string; // "약 35분" 형태 텍스트
}

/**
 * 위경도 두 지점 간의 직선 거리(km)를 Haversine 공식으로 계산합니다.
 */
export function calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371; // 지구 반지름 (km)
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(degrees: number): number {
    return (degrees * Math.PI) / 180;
}

/**
 * 직선 거리를 기반으로 수도권 대중교통/도로 굴곡도 및 환승 대기시간을 반영한 출퇴근 시간을 추정합니다.
 */
export function estimateCommuteTime(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): CommuteEstimate {
    const straightKm = calculateHaversineDistance(lat1, lon1, lat2, lon2);
    // 굴곡 보정계수 (직선거리 대비 실제 도로/지하철 노선거리 평균 1.35배)
    const roadKm = straightKm * 1.35;

    // 평균 대중교통 시내 속도: 약 24 km/h + 기본 환승/도보 대기시간 10분
    const baseMinutes = (roadKm / 24) * 60;
    const totalMinutes = Math.round(baseMinutes + (straightKm > 0.5 ? 10 : 3));

    let formattedText = '';
    if (totalMinutes < 60) {
        formattedText = `약 ${totalMinutes}분`;
    } else {
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        formattedText = mins > 0 ? `약 ${hours}시간 ${mins}분` : `약 ${hours}시간`;
    }

    return {
        straightDistanceKm: Math.round(straightKm * 10) / 10,
        estimatedDistanceKm: Math.round(roadKm * 10) / 10,
        estimatedMinutes: totalMinutes,
        formattedTimeText: formattedText,
    };
}

/**
 * 카카오맵 대중교통 길찾기 외부 링크 생성
 */
export function getKakaoDirectionsUrl(
    destName: string,
    destLat: number,
    destLng: number,
    originLat?: number,
    originLng?: number
): string {
    if (originLat && originLng) {
        return `https://map.kakao.com/link/to/${encodeURIComponent(
            destName
        )},${destLat},${destLng}/from/내집,${originLat},${originLng}`;
    }
    return `https://map.kakao.com/link/to/${encodeURIComponent(destName)},${destLat},${destLng}`;
}

/**
 * 네이버 지도 대중교통 길찾기 외부 링크 생성
 */
export function getNaverDirectionsUrl(
    destName: string,
    destLat: number,
    destLng: number,
    originLat?: number,
    originLng?: number
): string {
    if (originLat && originLng) {
        return `https://map.naver.com/v5/directions/${originLng},${originLat},내집,,ADDRESS_POI/${destLng},${destLat},${encodeURIComponent(
            destName
        )},,PUB/TRANSIT`;
    }
    return `https://map.naver.com/v5/search/${encodeURIComponent(destName)}`;
}
