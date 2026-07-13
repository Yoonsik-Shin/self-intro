# 0001 Two Sum

## Source

- LeetCode 1. Two Sum

## Problem

정수 배열 `nums`와 정수 `target`이 주어질 때, 합이 `target`이 되는 서로 다른 두 인덱스를 반환합니다.

## Constraints

- 같은 원소를 두 번 사용할 수 없습니다.
- 정답은 하나만 있다고 가정합니다.

## Approach

`HashMap`에 지금까지 본 값과 인덱스를 저장합니다. 현재 값 `x`에 대해 `target - x`가 이미 등장했다면 두 인덱스를 반환합니다.

## Complexity

- Time: `O(n)`
- Space: `O(n)`

## Review

- 핵심 개념: HashMap lookup
- 다시 풀 날짜:

