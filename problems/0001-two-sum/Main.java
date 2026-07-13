import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        Solution solution = new Solution();

        assertArrayEquals(new int[] { 0, 1 }, solution.twoSum(new int[] { 2, 7, 11, 15 }, 9));
        assertArrayEquals(new int[] { 1, 2 }, solution.twoSum(new int[] { 3, 2, 4 }, 6));
        assertArrayEquals(new int[] { 0, 1 }, solution.twoSum(new int[] { 3, 3 }, 6));

        System.out.println("All tests passed");
    }

    private static void assertArrayEquals(int[] expected, int[] actual) {
        if (!Arrays.equals(expected, actual)) {
            throw new AssertionError("expected=" + Arrays.toString(expected) + ", actual=" + Arrays.toString(actual));
        }
    }
}

