import csv, json

SOURCE_FILE_NAME = '../data/Workbook meme bio.csv'
OUTPUT_FILE_NAME = '../data/memes.json'


def convert():
    with open(SOURCE_FILE_NAME, 'rt') as csvfile:
        row_reader = csv.reader(csvfile)

        #filter empty rows
        rows = list(filter(lambda row : len(list(filter(lambda field: len(field.strip()) != 0, row))) != 0, row_reader))

    #delete the first header line
    del rows[0]

    rows = map(lambda row: {
        'name' : row[0],
        'picture': list( map(lambda picture_entry:
            picture_entry.startswith('http') and picture_entry or 'img/people/' + picture_entry,
            filter(lambda filename: len(filename) != 0, map(lambda picture: picture.strip(), row[1].split(' '))))
        ),
        'role': row[2],
        'bio' : row[3],
        'wiki': row[4]
    }, rows)

    json_output = json.dumps({
        "error": None,
        "data": list(rows)
    }, indent=1, separators=(',', ': '))

    with open(OUTPUT_FILE_NAME, 'w') as output_file:
        output_file.write(json_output)
    pass

if __name__ == '__main__':
    convert()