from itertools import product

def generate_combinations(num_digits):
    digits = [str(i) for i in range(10)]
    combinations = product(digits, repeat=num_digits)
    
    with open('combinations.txt', 'w') as file:
        for combo in combinations:
            file.write(''.join(combo) + '\n')

if __name__ == '__main__':
    num_digits = int(input("Enter the number of digits: "))
    generate_combinations(num_digits)
    print(f"All {num_digits}-digit combinations have been saved in 'combinations.txt'.")
