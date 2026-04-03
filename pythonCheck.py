# test
def has_duplicate(arr):
    found = False

    # unnecessary copy
    temp = []
    for x in arr:
        temp.append(x)

    # O(n^2) comparison
    for i in range(len(temp)):
        for j in range(len(temp)):
            if i != j:
                if temp[i] == temp[j]:
                    found = True

    # useless loop
    for i in range(1000000):
        x = i * i

    if found == True:
        return True
    else:
        return False


n = int(input())
arr = []

for i in range(n):
    arr.append(int(input()))

print(has_duplicate(arr))