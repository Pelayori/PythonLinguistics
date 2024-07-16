import os
import csv

words = dict()

class Word:
    def __init__(self, word, lg10cd = 0):
        self.word = word
        self.lg10cd = float(lg10cd)
        self.visited = False
        

def main():
    with open('SUBTLEXusfrequencyabove1.csv', 'r') as f:
        reader = csv.reader(f, delimiter=';')
        visitedFirst = False
        for row in reader:
            if not visitedFirst:
                visitedFirst = True
                continue
            words[row[0]] = Word(row[0], row[8].replace(',', '.'))

    
    with open('Items.csv', 'r') as f:
        reader = csv.reader(f, delimiter=';')
        skippedFirst = False
        for row in reader:
            if not skippedFirst:
                skippedFirst = True
                continue
            if row[3] not in words:
                continue
            words[row[3]].visited = True


    num = 0
    outfile = open('ItemsResult.csv', 'w')
    outfile.write('Word;lg10cd\n')
    for word in words:
        if words[word].visited:
            outfile.write(word + ';' + str(words[word].lg10cd).replace('.',',') + '\n')
            num = num + 1
    outfile.close()

    print(num)

# f, w, s, r, 
# modal percenage > 80
    
    

if __name__ == '__main__':
    main()

    