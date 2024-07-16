import os
import csv

words = dict()

class Word:
    def __init__(self, word, modal_response_percentage, zipf, visual_complex):
        self.word = word
        self.modal_response_percentage = modal_response_percentage
        self.zipf = float(zipf)
        self.visited = False
        self.visual_complex = visual_complex
        

def main():
    with open('./new_csvs/MultiPic2.csv', 'r') as f:
        reader = csv.reader(f, delimiter=';')
        skipFirst = True
        for row in reader:
            if skipFirst:
                skipFirst = False
                continue
            if len(row[2]) <= 0:
                continue

            words[row[2]] = Word(row[2], row[5], 0, row[10])

    with open('./new_csvs/ZipfResult.csv', 'r') as f:
        reader = csv.reader(f, delimiter=';')
        skipFirst = True
        for row in reader:
            if skipFirst:
                skipFirst = False
                continue
            if row[0] in words:
                if len(row[0]) <= 0:
                    continue
                words[row[0]].visited = True

    num = 0
    outfile = open('ZipfResult.csv', 'w')
    outfile.write('Word;Visual Complexity\n')
    num = 0
    for word in words:
        if words[word].visited:
            print(word + ';' + str(words[word].visual_complex))
            outfile.write(word + ';' + str(words[word].visual_complex) + '\n')
            num = num + 1
    outfile.close()
    print(num)

# f, w, s, r, 
# modal percenage > 80
    
    

if __name__ == '__main__':
    main()

    