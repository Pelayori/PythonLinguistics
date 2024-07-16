import os
import csv

words = dict()

class Word:
    def __init__(self, word, modal_response_percentage, zipf, code):
        self.word = word
        self.modal_response_percentage = modal_response_percentage
        self.zipf = float(zipf)
        self.visited = False
        self.code = code
        

def main():
    words_multipic = []
    words_subtlex = []
    with open('MultiPic.csv', 'r') as f:
        reader = csv.reader(f, delimiter=';')
        for row in reader:
            if row[0] != 'American English':
                continue

            first_char = row[4][0]

            if first_char not in ['f', 'w', 's', 'r', 'l']:
                continue

            if float(row[5].replace(',', '.')) > 80:
                words[row[4]] = Word(row[4], row[5], 0, row[1])

    with open('SUBTLEX-zipf.csv', 'r') as f:
        reader = csv.reader(f, delimiter=';')
        for row in reader:
            if row[0] in words:
                words[row[0]].zipf = float(row[14].replace(',', '.'))
                words[row[0]].visited = True

    num = 0
    outfile = open('ZipfResult.csv', 'w')
    outfile.write('Word;Code;Freq;Zipf\n')
    num = 0
    for word in words:
        if words[word].visited and words[word].zipf >= 3.0:
            print(word, words[word].modal_response_percentage, words[word].zipf)
            outfile.write(word + ';' + words[word].code + ';' + str(words[word].modal_response_percentage).replace('.',',') + ';' + str(words[word].zipf).replace('.',',') + '\n')
            num = num + 1
    outfile.close()
    print(num)

# f, w, s, r, 
# modal percenage > 80
    
    

if __name__ == '__main__':
    main()

    